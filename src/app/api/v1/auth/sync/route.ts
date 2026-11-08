import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  isServicesBusiness,
  normalizeBusinessType,
  normalizeServiceSubtype,
} from "@/lib/business/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, name, websiteUrl, businessName, businessType, businessSubtype } = body;

    if (!email) {
      return NextResponse.json(
        { error: { message: "Email is required to sync user profile" } },
        { status: 400 }
      );
    }

    // 1. Upsert User in Prisma database
    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: {
        name: name || undefined,
      },
      create: {
        id: userId || undefined,
        email: email.toLowerCase(),
        name: name || email.split("@")[0],
      },
    });

    // 2. Check if user already belongs to a business
    const existingMembership = await prisma.businessMember.findFirst({
      where: { userId: user.id },
      include: { business: true },
    });

    if (existingMembership) {
      const response = NextResponse.json({
        status: "success",
        user,
        business: existingMembership.business,
        role: existingMembership.role,
      });

      response.cookies.set("nesale_session", user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return response;
    }

    // 3. Otherwise create default tenant business for this new user
    const storeName = businessName || (name ? `${name}'s Store` : "My Store");
    const baseSlug = storeName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    const business = await prisma.business.create({
      data: {
        name: storeName,
        slug: uniqueSlug,
        businessType: normalizeBusinessType(businessType),
        businessSubtype: isServicesBusiness(businessType)
          ? normalizeServiceSubtype(businessSubtype) || "other"
          : null,
        websiteUrl: websiteUrl || "https://example.com",
        description: "Autonomous AI sales-assisted storefront",
      },
    });

    // 4. Assign user as owner
    await prisma.businessMember.create({
      data: {
        businessId: business.id,
        userId: user.id,
        role: "owner",
      },
    });

    // 5. Initialize default widget config
    await prisma.widgetConfig.create({
      data: {
        businessId: business.id,
        primaryColor: "#4f46e5",
        position: "bottom-right",
        assistantName: "Sophia",
        welcomeMessage: "Hi there! How can I help you find the perfect product today?",
        showBranding: true,
      },
    });

    const response = NextResponse.json({
      status: "success",
      user,
      business,
      role: "owner",
    });

    response.cookies.set("nesale_session", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error("[Auth Sync API] Error:", error);
    return NextResponse.json(
      {
        error: {
          code: "SYNC_ERROR",
          message: error?.message || "Failed to sync user and tenant profile.",
        },
      },
      { status: 500 }
    );
  }
}
