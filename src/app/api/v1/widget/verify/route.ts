import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    const testUrl = searchParams.get("storeUrl");

    let biz: any = null;

    if (businessId) {
      biz = await prisma.business.findUnique({
        where: { id: businessId },
        include: { businessSettings: true, products: { take: 10 } },
      });
      if (!biz) {
        biz = await prisma.business.findFirst({
          where: { slug: businessId },
          include: { businessSettings: true, products: { take: 10 } },
        });
      }
    }

    if (!biz) {
      biz = await prisma.business.findFirst({
        orderBy: { createdAt: "desc" },
        include: { businessSettings: true, products: { take: 10 } },
      });
    }

    if (!biz) {
      return NextResponse.json(
        { error: { message: "No business found." } },
        { status: 404 }
      );
    }

    const settings = (biz.businessSettings?.settings as Record<string, any>) || {};
    const lastPingAt = settings.lastScriptPingAt;
    const isRecentlyPinged = !!(
      lastPingAt &&
      Date.now() - new Date(lastPingAt).getTime() < 1000 * 60 * 60 * 24 * 30 // 30 days active window
    );

    let htmlScanDetected = false;
    let rawTarget = testUrl || settings.installedDomain || biz.websiteUrl;
    let scanTarget = rawTarget;
    if (scanTarget && !scanTarget.startsWith("http")) {
      scanTarget = `https://${scanTarget}`;
    }

    // Optional active scan: if storeUrl is provided and no recent ping, attempt light scan of the public page
    if (!isRecentlyPinged && scanTarget && scanTarget.startsWith("http")) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const pageRes = await fetch(scanTarget, {
          signal: controller.signal,
          headers: {
            "User-Agent": "NESale-Script-Validator/1.0",
          },
        });
        clearTimeout(timeout);

        if (pageRes.ok) {
          const html = await pageRes.text();
          if (html.includes("widget.js") || html.includes("data-business-id") || html.includes("nesale")) {
            htmlScanDetected = true;
          }
        }
      } catch (scanErr) {
        // Safe to ignore network/timeout on merchant dev domains
      }
    }

    const isConnected = !!(settings.scriptInstalled || isRecentlyPinged || htmlScanDetected);
    const nowIso = new Date().toISOString();

    const cleanDomain = (rawTarget || settings.installedDomain || biz.websiteUrl || "")
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");

    // Persist verified state so page reloads permanently stay connected!
    if (isConnected) {
      const updatedSettings = {
        ...settings,
        scriptInstalled: true,
        lastScriptPingAt: lastPingAt || nowIso,
        installedDomain: cleanDomain || settings.installedDomain || "tech-nexa-hub.vercel.app",
      };

      await prisma.$transaction([
        prisma.businessSettings.upsert({
          where: { businessId: biz.id },
          create: {
            businessId: biz.id,
            settings: updatedSettings,
          },
          update: {
            settings: updatedSettings,
          },
        }),
        prisma.business.update({
          where: { id: biz.id },
          data: {
            status: "active",
            ...(cleanDomain ? { websiteUrl: `https://${cleanDomain}` } : {}),
          },
        }),
      ]).catch((err) => console.warn("[Verify Persist Warning]:", err));
    }

    return NextResponse.json({
      status: "success",
      connected: isConnected,
      businessId: biz.id,
      businessName: biz.name,
      installedDomain: cleanDomain || settings.installedDomain || "Pending installation",
      lastPingAt: lastPingAt || (isConnected ? nowIso : null),
      detectedVia: isRecentlyPinged ? "live_script_heartbeat" : htmlScanDetected ? "html_header_scan" : settings.scriptInstalled ? "persisted_session" : "none",
      productsHarvested: settings.productsHarvestedCount || biz.products.length || 0,
      message: isConnected
        ? `NESale script is live and actively connected to ${cleanDomain || settings.installedDomain || "your website"}.`
        : "Script not detected yet. Please ensure the snippet is added to your website header or before </body>.",
    });
  } catch (error: any) {
    console.error("[Widget Verify API] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Verification check failed" } },
      { status: 500 }
    );
  }
}
