import { describe, it, expect, vi, beforeEach } from "vitest";
import { MerchantNotifier } from "./notifier";
import { prisma } from "@/lib/db/prisma";
import { encryptSecret } from "@/lib/security/encryption";

describe("MerchantNotifier", () => {
  let notifier: MerchantNotifier;

  beforeEach(() => {
    notifier = new MerchantNotifier();
    vi.restoreAllMocks();
  });

  it("handles lead capture notification gracefully when no channels configured", async () => {
    vi.spyOn(prisma.integration, "findMany").mockResolvedValue([]);
    const result = await notifier.notifyLeadCaptured(
      {
        id: "lead_123",
        businessId: "biz_test",
        name: "Alice Smith",
        email: "alice@example.com",
        phone: "+1234567890",
        notes: "Interested in high-end camping gear",
        source: "chat_widget",
        createdAt: new Date().toISOString(),
      },
      {
        name: "Test Business",
        email: null,
      }
    );

    expect(result.success).toBe(true);
    expect(result.channels.email).toBeUndefined();
    expect(result.channels.webhook).toBeUndefined();
  });

  it("dispatches webhook when webhook URL is present", async () => {
    vi.spyOn(prisma.integration, "findMany").mockResolvedValue([]);
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const result = await notifier.notifyLeadCaptured(
      {
        id: "lead_456",
        businessId: "biz_test",
        name: "Bob Jones",
        email: "bob@example.com",
        createdAt: new Date().toISOString(),
      },
      {
        name: "Test Store",
        settings: {
          webhookUrl: "https://hooks.zapier.com/hooks/catch/123/456",
        },
      }
    );

    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toBe("https://hooks.zapier.com/hooks/catch/123/456");
    expect(result.channels.webhook).toBe(true);
  });

  it("dispatches appointment booking notification", async () => {
    vi.spyOn(prisma.integration, "findMany").mockResolvedValue([]);
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const result = await notifier.notifyAppointmentBooked(
      {
        id: "app_789",
        businessId: "biz_test",
        customerName: "Charlie Brown",
        customerEmail: "charlie@example.com",
        serviceName: "General Consultation",
        staffName: "Dr. Adams",
        startAt: new Date(Date.now() + 86400000).toISOString(),
        endAt: new Date(Date.now() + 86400000 + 3600000).toISOString(),
        timezone: "America/New_York",
      },
      {
        name: "Health Clinic",
        settings: {
          webhookUrl: "https://webhook.site/test-endpoint",
        },
      }
    );

    expect(fetchMock).toHaveBeenCalled();
    expect(result.channels.webhook).toBe(true);
    expect(result.success).toBe(true);
  });

  it("dispatches lead capture event to BYO-key active Slack integration with decrypted webhook", async () => {
    const rawSlackUrl = "https://hooks.slack.com/services/T11/B22/SEC123";
    const encryptedUrl = encryptSecret(rawSlackUrl);

    vi.spyOn(prisma.integration, "findMany").mockResolvedValue([
      {
        id: "integ_slack_1",
        businessId: "biz_test",
        provider: "slack",
        status: "active",
        accessTokenEncrypted: encryptedUrl,
        metadata: {
          triggers: { leadCaptured: true, appointmentBooked: false },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        externalAccountId: null,
        refreshTokenEncrypted: null,
        tokenExpiresAt: null,
        teamId: null,
      } as any,
    ]);

    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const result = await notifier.notifyLeadCaptured(
      {
        id: "lead_999",
        businessId: "biz_test",
        name: "Diana Prince",
        email: "diana@themyscira.com",
        phone: "+1555000111",
        createdAt: new Date().toISOString(),
      },
      {
        name: "Hero Supplies",
      }
    );

    expect(fetchMock).toHaveBeenCalled();
    const calls = fetchMock.mock.calls;
    const slackCall = calls.find((c) => c[0] === rawSlackUrl);
    expect(slackCall).toBeDefined();
    expect(result.channels.integrations?.slack_integ_slack_1).toBe(true);
  });
});
