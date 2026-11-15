import { describe, it, expect, vi, beforeEach } from "vitest";
import { MerchantNotifier } from "./notifier";

describe("MerchantNotifier", () => {
  let notifier: MerchantNotifier;

  beforeEach(() => {
    notifier = new MerchantNotifier();
    vi.restoreAllMocks();
  });

  it("handles lead capture notification gracefully when no channels configured", async () => {
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
});
