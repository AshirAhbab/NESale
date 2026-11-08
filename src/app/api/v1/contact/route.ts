import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, email, inquiryType = "general", storeUrl, monthlyVolume, message } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { error: "Full name is required." },
        { status: 400 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message content cannot be blank." },
        { status: 400 }
      );
    }

    const ticketId = Math.floor(100000 + Math.random() * 900000);

    // Attempt to persist as a platform lead in Prisma if a business exists
    try {
      const defaultBiz = await prisma.business.findFirst();
      if (defaultBiz) {
        await prisma.lead.create({
          data: {
            businessId: defaultBiz.id,
            name: fullName.trim(),
            email: email.trim().toLowerCase(),
            status: "new",
            source: `contact_page_${inquiryType}`,
            notes: `[Ticket #${ticketId}] [Traffic: ${monthlyVolume || "N/A"}] [Store: ${storeUrl || "N/A"}]\n${message.trim()}`,
          },
        });
      }
    } catch (dbErr) {
      console.warn("[Contact API] Could not save lead to database, proceeding gracefully:", dbErr);
    }

    return NextResponse.json({
      success: true,
      ticketId,
      message: "Thank you for reaching out. An enterprise specialist will follow up shortly.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to submit inquiry";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
