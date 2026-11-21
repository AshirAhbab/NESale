import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { decryptSecret } from "@/lib/security/encryption";

export interface LeadNotificationPayload {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone?: string | null;
  notes?: string | null;
  source?: string | null;
  createdAt: string | Date;
}

export interface AppointmentNotificationPayload {
  id: string;
  businessId: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  serviceName?: string | null;
  staffName?: string | null;
  startAt: string | Date;
  endAt: string | Date;
  timezone?: string | null;
  status?: string;
  notes?: string | null;
}

export interface NotificationResult {
  success: boolean;
  channels: {
    webhook?: boolean;
    email?: boolean;
    whatsapp?: boolean;
    integrations?: Record<string, boolean>;
  };
  errors?: string[];
}

export class MerchantNotifier {
  /**
   * Dispatches instant alerts when a new shopper lead is captured.
   */
  async notifyLeadCaptured(
    lead: LeadNotificationPayload,
    businessOverride?: { name?: string; email?: string | null; settings?: any }
  ): Promise<NotificationResult> {
    const result: NotificationResult = {
      success: true,
      channels: {},
      errors: [],
    };

    try {
      const businessInfo = await this.resolveBusinessContact(lead.businessId, businessOverride);
      const timestamp = new Date(lead.createdAt).toISOString();

      const webhookPayload = {
        event: "lead.captured",
        timestamp,
        business: {
          id: lead.businessId,
          name: businessInfo.name,
        },
        data: {
          leadId: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone || null,
          notes: lead.notes || null,
          source: lead.source || "chat_widget",
          capturedAt: timestamp,
        },
      };

      // 1. Webhook alert (e.g. Zapier, Make, Slack, custom webhook)
      if (businessInfo.webhookUrl) {
        try {
          const res = await fetch(businessInfo.webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "NE_Sale-Notifier/1.0",
              "X-NE-Sale-Event": "lead.captured",
            },
            body: JSON.stringify(webhookPayload),
            signal: AbortSignal.timeout(5000),
          });
          result.channels.webhook = res.ok;
          if (!res.ok) {
            result.errors?.push(`Webhook responded with status ${res.status}`);
          }
        } catch (err: any) {
          result.channels.webhook = false;
          result.errors?.push(`Webhook dispatch error: ${err?.message}`);
        }
      }

      // 2. Email alert (via Resend or SendGrid)
      const recipientEmail = businessInfo.email;
      if (recipientEmail) {
        const emailSent = await this.sendEmail({
          to: recipientEmail,
          subject: `🎯 New Lead Captured: ${lead.name} (${businessInfo.name})`,
          html: this.renderLeadEmailHtml(lead, businessInfo.name),
        });
        result.channels.email = emailSent;
      }

      // 3. WhatsApp notification (if configured)
      if (businessInfo.whatsapp) {
        const whatsappSent = await this.sendWhatsAppMessage({
          to: businessInfo.whatsapp,
          message: `🎯 *New Lead Captured*\n\n*Business:* ${businessInfo.name}\n*Name:* ${lead.name}\n*Email:* ${lead.email}\n*Phone:* ${lead.phone || "N/A"}\n*Notes:* ${lead.notes || "Inquired via chat widget"}`,
        });
        result.channels.whatsapp = whatsappSent;
      }

      // 4. Dispatch to BYO-Key Active Integrations
      await this.dispatchToActiveIntegrations(lead.businessId, "lead.captured", webhookPayload, result);

      console.log(`[MerchantNotifier] Lead notification completed for biz ${lead.businessId}:`, result.channels);
      return result;
    } catch (globalErr: any) {
      console.warn("[MerchantNotifier] Failed to process lead notification:", globalErr);
      return { success: false, channels: {}, errors: [globalErr?.message] };
    }
  }

  /**
   * Dispatches instant alerts when an appointment or service booking is scheduled.
   */
  async notifyAppointmentBooked(
    appointment: AppointmentNotificationPayload,
    businessOverride?: { name?: string; email?: string | null; settings?: any }
  ): Promise<NotificationResult> {
    const result: NotificationResult = {
      success: true,
      channels: {},
      errors: [],
    };

    try {
      const businessInfo = await this.resolveBusinessContact(appointment.businessId, businessOverride);
      const startIso = new Date(appointment.startAt).toISOString();
      const endIso = new Date(appointment.endAt).toISOString();

      const webhookPayload = {
        event: "appointment.booked",
        timestamp: new Date().toISOString(),
        business: {
          id: appointment.businessId,
          name: businessInfo.name,
        },
        data: {
          appointmentId: appointment.id,
          customerName: appointment.customerName,
          customerEmail: appointment.customerEmail || null,
          customerPhone: appointment.customerPhone || null,
          serviceName: appointment.serviceName || "Service Consultation",
          staffName: appointment.staffName || "Unassigned",
          startAt: startIso,
          endAt: endIso,
          timezone: appointment.timezone || "UTC",
          status: appointment.status || "confirmed",
          notes: appointment.notes || null,
        },
      };

      // 1. Webhook alert
      if (businessInfo.webhookUrl) {
        try {
          const res = await fetch(businessInfo.webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "NE_Sale-Notifier/1.0",
              "X-NE-Sale-Event": "appointment.booked",
            },
            body: JSON.stringify(webhookPayload),
            signal: AbortSignal.timeout(5000),
          });
          result.channels.webhook = res.ok;
          if (!res.ok) {
            result.errors?.push(`Webhook responded with status ${res.status}`);
          }
        } catch (err: any) {
          result.channels.webhook = false;
          result.errors?.push(`Webhook dispatch error: ${err?.message}`);
        }
      }

      // 2. Email alert
      const recipientEmail = businessInfo.email;
      if (recipientEmail) {
        const emailSent = await this.sendEmail({
          to: recipientEmail,
          subject: `📅 New Appointment: ${appointment.customerName} - ${appointment.serviceName || "Consultation"} (${businessInfo.name})`,
          html: this.renderAppointmentEmailHtml(appointment, businessInfo.name),
        });
        result.channels.email = emailSent;
      }

      // 3. WhatsApp notification
      if (businessInfo.whatsapp) {
        const startDateFormatted = new Date(appointment.startAt).toLocaleString();
        const whatsappSent = await this.sendWhatsAppMessage({
          to: businessInfo.whatsapp,
          message: `📅 *New Appointment Booked*\n\n*Business:* ${businessInfo.name}\n*Client:* ${appointment.customerName}\n*Service:* ${appointment.serviceName || "Consultation"}\n*Staff:* ${appointment.staffName || "Team"}\n*Time:* ${startDateFormatted} (${appointment.timezone || "UTC"})\n*Contact:* ${appointment.customerEmail || appointment.customerPhone || "N/A"}`,
        });
        result.channels.whatsapp = whatsappSent;
      }

      // 4. Dispatch to BYO-Key Active Integrations
      await this.dispatchToActiveIntegrations(appointment.businessId, "appointment.booked", webhookPayload, result);

      console.log(`[MerchantNotifier] Appointment notification completed for biz ${appointment.businessId}:`, result.channels);
      return result;
    } catch (globalErr: any) {
      console.warn("[MerchantNotifier] Failed to process appointment notification:", globalErr);
      return { success: false, channels: {}, errors: [globalErr?.message] };
    }
  }

  /**
   * Helper to resolve merchant notification targets and settings.
   */
  private async resolveBusinessContact(
    businessId: string,
    override?: { name?: string; email?: string | null; settings?: any }
  ) {
    if (override?.name && (override?.email || override?.settings)) {
      const s = override.settings || {};
      return {
        name: override.name,
        email: override.email || s.notificationEmail || s.email || process.env.MERCHANT_ALERT_EMAIL || null,
        phone: s.phone || null,
        whatsapp: s.whatsapp || null,
        webhookUrl: s.webhookUrl || s.notificationWebhookUrl || process.env.MERCHANT_NOTIFICATION_WEBHOOK_URL || null,
      };
    }

    try {
      const biz = await prisma.business.findUnique({
        where: { id: businessId },
        include: { businessSettings: true },
      });

      if (!biz) {
        return {
          name: "NE_Sale Store",
          email: process.env.MERCHANT_ALERT_EMAIL || null,
          phone: null,
          whatsapp: null,
          webhookUrl: process.env.MERCHANT_NOTIFICATION_WEBHOOK_URL || null,
        };
      }

      const settings = (biz.businessSettings?.settings as Record<string, any>) || {};
      const webhookUrl =
        settings.webhookUrl ||
        settings.notificationWebhookUrl ||
        process.env.MERCHANT_NOTIFICATION_WEBHOOK_URL ||
        null;

      const email =
        biz.businessSettings?.email ||
        biz.email ||
        settings.notificationEmail ||
        settings.email ||
        process.env.MERCHANT_ALERT_EMAIL ||
        null;

      const phone = biz.businessSettings?.phone || biz.phone || settings.phone || null;
      const whatsapp = biz.businessSettings?.whatsapp || biz.whatsapp || settings.whatsapp || null;

      return {
        name: biz.name,
        email,
        phone,
        whatsapp,
        webhookUrl,
      };
    } catch {
      return {
        name: "NE_Sale Store",
        email: process.env.MERCHANT_ALERT_EMAIL || null,
        phone: null,
        whatsapp: null,
        webhookUrl: process.env.MERCHANT_NOTIFICATION_WEBHOOK_URL || null,
      };
    }
  }

  /**
   * Sends transactional email using Resend or SendGrid.
   */
  private async sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
    const resendApiKey = process.env.RESEND_API_KEY;
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const fromAddress = process.env.NOTIFICATION_FROM_EMAIL || "alerts@nesale.ai";

    if (resendApiKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: fromAddress,
            to: opts.to,
            subject: opts.subject,
            html: opts.html,
          }),
          signal: AbortSignal.timeout(5000),
        });
        return res.ok;
      } catch (err) {
        console.warn("[MerchantNotifier] Resend email dispatch failed:", err);
      }
    }

    if (sendgridApiKey) {
      try {
        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sendgridApiKey}`,
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: opts.to }] }],
            from: { email: fromAddress },
            subject: opts.subject,
            content: [{ type: "text/html", value: opts.html }],
          }),
          signal: AbortSignal.timeout(5000),
        });
        return res.ok;
      } catch (err) {
        console.warn("[MerchantNotifier] SendGrid email dispatch failed:", err);
      }
    }

    // If no production email credentials configured, log and return true in development
    console.log(`[MerchantNotifier] Email alert prepared for ${opts.to}: "${opts.subject}" (Set RESEND_API_KEY or SENDGRID_API_KEY to send live email)`);
    return true;
  }

  /**
   * Sends WhatsApp messages via WhatsApp Business Cloud API if configured.
   */
  private async sendWhatsAppMessage(opts: { to: string; message: string }): Promise<boolean> {
    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (token && phoneId) {
      try {
        const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: opts.to.replace(/\D/g, ""),
            type: "text",
            text: { preview_url: false, body: opts.message },
          }),
          signal: AbortSignal.timeout(5000),
        });
        return res.ok;
      } catch (err) {
        console.warn("[MerchantNotifier] WhatsApp dispatch failed:", err);
      }
    }

    console.log(`[MerchantNotifier] WhatsApp alert prepared for ${opts.to} (Set WHATSAPP_API_TOKEN to deliver)`);
    return true;
  }

  private renderLeadEmailHtml(lead: LeadNotificationPayload, businessName: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f1f5f9; padding: 24px; margin: 0; }
            .card { background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 24px; max-width: 580px; margin: 0 auto; }
            .header { border-bottom: 1px solid #1f2937; padding-bottom: 16px; margin-bottom: 20px; }
            .badge { display: inline-block; background-color: #064e3b; color: #34d399; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e293b; }
            .label { color: #94a3b8; font-size: 14px; }
            .value { color: #f8fafc; font-size: 14px; font-weight: 500; }
            .notes { background-color: #1e293b; padding: 12px; border-radius: 8px; margin-top: 16px; font-size: 13px; color: #cbd5e1; }
            .footer { margin-top: 24px; font-size: 12px; color: #64748b; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <span class="badge">🎯 NEW LEAD CAPTURED</span>
              <h2 style="margin: 12px 0 4px 0; color: #ffffff;">${escapeHtml(lead.name)}</h2>
              <p style="margin: 0; color: #94a3b8; font-size: 14px;">Store: ${escapeHtml(businessName)}</p>
            </div>
            <div>
              <div class="row">
                <span class="label">Email</span>
                <span class="value"><a href="mailto:${escapeHtml(lead.email)}" style="color: #38bdf8;">${escapeHtml(lead.email)}</a></span>
              </div>
              ${lead.phone ? `
              <div class="row">
                <span class="label">Phone</span>
                <span class="value">${escapeHtml(lead.phone)}</span>
              </div>` : ''}
              <div class="row">
                <span class="label">Source</span>
                <span class="value">${escapeHtml(lead.source || "chat_widget")}</span>
              </div>
              <div class="row">
                <span class="label">Time</span>
                <span class="value">${new Date(lead.createdAt).toLocaleString()}</span>
              </div>
            </div>
            ${lead.notes ? `
            <div class="notes">
              <strong>Shopper Query / Notes:</strong><br/>
              ${escapeHtml(lead.notes)}
            </div>` : ''}
            <div class="footer">
              Sent automatically by NE_Sale AI Assistant.
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private renderAppointmentEmailHtml(appointment: AppointmentNotificationPayload, businessName: string): string {
    const formattedDate = new Date(appointment.startAt).toLocaleString();
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f1f5f9; padding: 24px; margin: 0; }
            .card { background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 24px; max-width: 580px; margin: 0 auto; }
            .header { border-bottom: 1px solid #1f2937; padding-bottom: 16px; margin-bottom: 20px; }
            .badge { display: inline-block; background-color: #1e3a8a; color: #60a5fa; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e293b; }
            .label { color: #94a3b8; font-size: 14px; }
            .value { color: #f8fafc; font-size: 14px; font-weight: 500; }
            .footer { margin-top: 24px; font-size: 12px; color: #64748b; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <span class="badge">📅 NEW APPOINTMENT</span>
              <h2 style="margin: 12px 0 4px 0; color: #ffffff;">${escapeHtml(appointment.customerName)}</h2>
              <p style="margin: 0; color: #94a3b8; font-size: 14px;">Business: ${escapeHtml(businessName)}</p>
            </div>
            <div>
              <div class="row">
                <span class="label">Service</span>
                <span class="value">${escapeHtml(appointment.serviceName || "Service Consultation")}</span>
              </div>
              <div class="row">
                <span class="label">Assigned Staff</span>
                <span class="value">${escapeHtml(appointment.staffName || "Team")}</span>
              </div>
              <div class="row">
                <span class="label">Appointment Time</span>
                <span class="value">${formattedDate} (${escapeHtml(appointment.timezone || "UTC")})</span>
              </div>
              ${appointment.customerEmail ? `
              <div class="row">
                <span class="label">Email</span>
                <span class="value"><a href="mailto:${escapeHtml(appointment.customerEmail)}" style="color: #38bdf8;">${escapeHtml(appointment.customerEmail)}</a></span>
              </div>` : ''}
              ${appointment.customerPhone ? `
              <div class="row">
                <span class="label">Phone</span>
                <span class="value">${escapeHtml(appointment.customerPhone)}</span>
              </div>` : ''}
            </div>
            <div class="footer">
              Sent automatically by NE_Sale Booking Assistant.
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Dispatches events to BYO-key connected third-party integrations (Slack, Discord, HubSpot, Webhooks, etc.)
   */
  private async dispatchToActiveIntegrations(
    businessId: string,
    event: "lead.captured" | "appointment.booked",
    payload: any,
    result: NotificationResult
  ): Promise<void> {
    if (!businessId) return;

    try {
      const integrations = await prisma.integration.findMany({
        where: {
          businessId,
          status: "active",
          provider: { not: "website" },
        },
      });

      if (!integrations || integrations.length === 0) return;

      if (!result.channels.integrations) {
        result.channels.integrations = {};
      }

      for (const item of integrations) {
        try {
          const meta = (item.metadata as Record<string, any>) || {};
          const triggers = meta.triggers || {};

          // Check event trigger filters
          if (event === "lead.captured" && triggers.leadCaptured === false) continue;
          if (event === "appointment.booked" && triggers.appointmentBooked === false) continue;

          // Decrypt secret credential
          let credential = "";
          if (item.accessTokenEncrypted) {
            try {
              credential = decryptSecret(item.accessTokenEncrypted);
            } catch {
              credential = item.accessTokenEncrypted;
            }
          }

          const provider = (item.provider || "").toLowerCase();

          // 1. Slack Incoming Webhook
          if (provider === "slack") {
            const webhookUrl = credential || meta.webhookUrl;
            if (webhookUrl && webhookUrl.startsWith("http")) {
              const textSummary =
                event === "lead.captured"
                  ? `🎯 *New Lead Captured:* ${payload.data?.name || "Shopper"} (${payload.data?.email || "No email"})`
                  : `📅 *New Appointment Booked:* ${payload.data?.customerName || "Customer"} - ${payload.data?.serviceName || "Consultation"}`;

              const res = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  text: textSummary,
                  blocks: [
                    {
                      type: "header",
                      text: {
                        type: "plain_text",
                        text: event === "lead.captured" ? "🎯 New Shopper Lead" : "📅 New Appointment Booked",
                      },
                    },
                    {
                      type: "section",
                      fields:
                        event === "lead.captured"
                          ? [
                              { type: "mrkdwn", text: `*Name:*\n${payload.data?.name || "N/A"}` },
                              { type: "mrkdwn", text: `*Email:*\n${payload.data?.email || "N/A"}` },
                              { type: "mrkdwn", text: `*Phone:*\n${payload.data?.phone || "N/A"}` },
                              { type: "mrkdwn", text: `*Source:*\n${payload.data?.source || "Chat Widget"}` },
                            ]
                          : [
                              { type: "mrkdwn", text: `*Client:*\n${payload.data?.customerName || "N/A"}` },
                              { type: "mrkdwn", text: `*Service:*\n${payload.data?.serviceName || "Consultation"}` },
                              {
                                type: "mrkdwn",
                                text: `*Date/Time:*\n${new Date(payload.data?.startAt).toLocaleString()}`,
                              },
                              {
                                type: "mrkdwn",
                                text: `*Contact:*\n${payload.data?.customerEmail || payload.data?.customerPhone || "N/A"}`,
                              },
                            ],
                    },
                  ],
                }),
                signal: AbortSignal.timeout(5000),
              });
              result.channels.integrations[`slack_${item.id}`] = res.ok;
            }
          }
          // 2. Discord Webhook
          else if (provider === "discord") {
            const webhookUrl = credential || meta.webhookUrl;
            if (webhookUrl && webhookUrl.startsWith("http")) {
              const isLead = event === "lead.captured";
              const res = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  content: isLead
                    ? `🎯 **New Lead:** ${payload.data?.name}`
                    : `📅 **New Appointment:** ${payload.data?.customerName} - ${payload.data?.serviceName}`,
                  embeds: [
                    {
                      title: isLead ? payload.data?.name : payload.data?.customerName,
                      color: isLead ? 0x4f46e5 : 0x10b981,
                      fields: isLead
                        ? [
                            { name: "Email", value: payload.data?.email || "N/A", inline: true },
                            { name: "Phone", value: payload.data?.phone || "N/A", inline: true },
                            { name: "Notes", value: payload.data?.notes || "Inquired via chat widget" },
                          ]
                        : [
                            { name: "Service", value: payload.data?.serviceName || "Consultation", inline: true },
                            { name: "Time", value: new Date(payload.data?.startAt).toLocaleString(), inline: true },
                            { name: "Email", value: payload.data?.customerEmail || "N/A", inline: true },
                            { name: "Phone", value: payload.data?.customerPhone || "N/A", inline: true },
                          ],
                      footer: { text: "NE_Sale Automated Integration Dispatch" },
                      timestamp: new Date().toISOString(),
                    },
                  ],
                }),
                signal: AbortSignal.timeout(5000),
              });
              result.channels.integrations[`discord_${item.id}`] = res.ok;
            }
          }
          // 3. Custom Webhook
          else if (provider === "webhook") {
            const webhookUrl = credential || meta.webhookUrl;
            if (webhookUrl && webhookUrl.startsWith("http")) {
              const headers: Record<string, string> = {
                "Content-Type": "application/json",
                "User-Agent": "NE_Sale-Webhook/1.0",
                "X-NE-Sale-Event": event,
              };
              if (meta.secret) {
                const hmac = crypto
                  .createHmac("sha256", meta.secret)
                  .update(JSON.stringify(payload))
                  .digest("hex");
                headers["X-NE-Sale-Signature"] = hmac;
              }
              const res = await fetch(webhookUrl, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(5000),
              });
              result.channels.integrations[`webhook_${item.id}`] = res.ok;
            }
          }
          // 4. HubSpot CRM
          else if (provider === "hubspot" && event === "lead.captured") {
            const token = credential;
            if (token) {
              const [firstName, ...rest] = (payload.data?.name || "").split(" ");
              const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  properties: {
                    email: payload.data?.email,
                    firstname: firstName || "Shopper",
                    lastname: rest.join(" ") || "",
                    phone: payload.data?.phone || "",
                    lifecyclestage: "lead",
                    message: payload.data?.notes || "Captured via NE_Sale AI Shopper",
                  },
                }),
                signal: AbortSignal.timeout(5000),
              });
              result.channels.integrations[`hubspot_${item.id}`] = res.ok;
            }
          }
          // 5. WhatsApp routing
          else if (provider === "whatsapp") {
            const phoneNumberId = meta.phoneNumberId;
            const token = credential;
            const recipient = meta.recipientPhone || payload.data?.phone;
            if (phoneNumberId && token && recipient) {
              const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: recipient,
                  type: "text",
                  text: {
                    body:
                      event === "lead.captured"
                        ? `🎯 *New Lead:* ${payload.data?.name} (${payload.data?.email || "No email"})\nPhone: ${payload.data?.phone || "N/A"}`
                        : `📅 *New Appointment:* ${payload.data?.customerName} on ${new Date(payload.data?.startAt).toLocaleString()}`,
                  },
                }),
                signal: AbortSignal.timeout(5000),
              });
              result.channels.integrations[`whatsapp_${item.id}`] = res.ok;
            }
          }
        } catch (itemErr: any) {
          console.warn(`[MerchantNotifier] Dispatch error for integration ${item.id} (${item.provider}):`, itemErr?.message);
        }
      }
    } catch (dbErr: any) {
      console.warn("[MerchantNotifier] Failed to query active integrations:", dbErr?.message);
    }
  }

}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const merchantNotifier = new MerchantNotifier();
