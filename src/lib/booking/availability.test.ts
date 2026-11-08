import { describe, it, expect } from "vitest";
import {
  dayOfWeekForDate,
  generateSlots,
  isSlotBookable,
  timeToMinutes,
  zonedDateTime,
} from "./availability";

const WEDNESDAY = "2026-07-01"; // dayOfWeek 3

describe("availability helpers", () => {
  it("parses and converts time strings", () => {
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("00:00")).toBe(0);
  });

  it("computes day of week from a date string", () => {
    expect(dayOfWeekForDate(WEDNESDAY)).toBe(3);
    expect(dayOfWeekForDate("2026-07-05")).toBe(0);
  });

  it("converts business-local times using the timezone", () => {
    const summer = zonedDateTime(WEDNESDAY, 9 * 60, "America/New_York");
    expect(summer.toISOString()).toBe("2026-07-01T13:00:00.000Z");

    const winter = zonedDateTime("2026-01-14", 9 * 60, "America/New_York");
    expect(winter.toISOString()).toBe("2026-01-14T14:00:00.000Z");
  });
});

describe("generateSlots", () => {
  it("generates slots that fit fully inside the schedule", () => {
    const slots = generateSlots({
      date: WEDNESDAY,
      schedules: [{ dayOfWeek: 3, startTime: "09:00", endTime: "11:00" }],
      durationMinutes: 30,
      stepMinutes: 30,
      now: new Date("2026-06-01T00:00:00Z"),
    });

    expect(slots.map((s) => s.start)).toEqual([
      "2026-07-01T09:00:00.000Z",
      "2026-07-01T09:30:00.000Z",
      "2026-07-01T10:00:00.000Z",
      "2026-07-01T10:30:00.000Z",
    ]);
  });

  it("returns no slots when the day is closed or inactive", () => {
    const closed = generateSlots({
      date: WEDNESDAY,
      schedules: [{ dayOfWeek: 3, startTime: "09:00", endTime: "11:00", isActive: false }],
      now: new Date("2026-06-01T00:00:00Z"),
    });
    expect(closed).toEqual([]);

    const wrongDay = generateSlots({
      date: WEDNESDAY,
      schedules: [{ dayOfWeek: 4, startTime: "09:00", endTime: "11:00" }],
      now: new Date("2026-06-01T00:00:00Z"),
    });
    expect(wrongDay).toEqual([]);
  });

  it("excludes slots that overlap existing appointments", () => {
    const slots = generateSlots({
      date: WEDNESDAY,
      schedules: [{ dayOfWeek: 3, startTime: "09:00", endTime: "11:00" }],
      durationMinutes: 30,
      stepMinutes: 30,
      appointments: [
        {
          startAt: new Date("2026-07-01T09:30:00Z"),
          endAt: new Date("2026-07-01T10:00:00Z"),
        },
      ],
      now: new Date("2026-06-01T00:00:00Z"),
    });

    expect(slots.map((s) => s.start)).toEqual([
      "2026-07-01T09:00:00.000Z",
      "2026-07-01T10:00:00.000Z",
      "2026-07-01T10:30:00.000Z",
    ]);
  });

  it("only uses the selected staff member's schedule", () => {
    const slots = generateSlots({
      date: WEDNESDAY,
      staffId: "staff-a",
      schedules: [
        { dayOfWeek: 3, startTime: "09:00", endTime: "10:00", staffId: "staff-a" },
        { dayOfWeek: 3, startTime: "13:00", endTime: "14:00", staffId: "staff-b" },
        { dayOfWeek: 3, startTime: "15:00", endTime: "16:00", staffId: null },
      ],
      durationMinutes: 30,
      stepMinutes: 30,
      now: new Date("2026-06-01T00:00:00Z"),
    });

    expect(slots.map((s) => s.start)).toEqual([
      "2026-07-01T09:00:00.000Z",
      "2026-07-01T09:30:00.000Z",
    ]);
  });

  it("filters slots that start before the lead time", () => {
    const slots = generateSlots({
      date: WEDNESDAY,
      schedules: [{ dayOfWeek: 3, startTime: "09:00", endTime: "11:00" }],
      durationMinutes: 30,
      stepMinutes: 30,
      now: new Date("2026-07-01T09:15:00Z"),
      leadTimeMinutes: 30,
    });

    expect(slots.map((s) => s.start)).toEqual([
      "2026-07-01T10:00:00.000Z",
      "2026-07-01T10:30:00.000Z",
    ]);
  });
});

describe("isSlotBookable", () => {
  const schedules = [{ dayOfWeek: 3, startTime: "09:00", endTime: "17:00" }];

  it("accepts a slot inside business hours", () => {
    expect(
      isSlotBookable({
        start: new Date("2026-07-01T09:00:00Z"),
        end: new Date("2026-07-01T09:30:00Z"),
        schedules,
      })
    ).toBe(true);
  });

  it("rejects slots outside business hours", () => {
    expect(
      isSlotBookable({
        start: new Date("2026-07-01T08:30:00Z"),
        end: new Date("2026-07-01T09:00:00Z"),
        schedules,
      })
    ).toBe(false);

    expect(
      isSlotBookable({
        start: new Date("2026-07-01T16:45:00Z"),
        end: new Date("2026-07-01T17:15:00Z"),
        schedules,
      })
    ).toBe(false);
  });

  it("rejects a slot that conflicts with an appointment", () => {
    expect(
      isSlotBookable({
        start: new Date("2026-07-01T10:00:00Z"),
        end: new Date("2026-07-01T10:30:00Z"),
        schedules,
        appointments: [
          {
            startAt: new Date("2026-07-01T10:15:00Z"),
            endAt: new Date("2026-07-01T10:45:00Z"),
          },
        ],
      })
    ).toBe(false);
  });

  it("allows non-overlapping staff appointments", () => {
    expect(
      isSlotBookable({
        start: new Date("2026-07-01T10:00:00Z"),
        end: new Date("2026-07-01T10:30:00Z"),
        schedules,
        staffId: "staff-a",
        appointments: [
          {
            startAt: new Date("2026-07-01T10:00:00Z"),
            endAt: new Date("2026-07-01T10:30:00Z"),
            staffId: "staff-b",
          },
        ],
      })
    ).toBe(true);
  });
});
