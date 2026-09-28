import { describe, it, expect } from "vitest";
import { addDays, getStreak } from "../streak-badge";

const TODAY = "2026-03-15";

function daysEndingAt(today: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(today, -i));
}

describe("addDays", () => {
  it("moves backwards and forwards", () => {
    expect(addDays("2026-03-15", -1)).toBe("2026-03-14");
    expect(addDays("2026-03-15", 1)).toBe("2026-03-16");
  });

  it("crosses month boundaries", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("crosses year boundaries", () => {
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
  });

  it("handles leap days", () => {
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
  });
});

describe("getStreak", () => {
  it("returns 0 with no dates", () => {
    expect(getStreak([], TODAY)).toEqual({ count: 0, activeToday: false, atRisk: false });
  });

  it("counts consecutive days ending today", () => {
    const result = getStreak(daysEndingAt(TODAY, 5), TODAY);
    expect(result).toEqual({ count: 5, activeToday: true, atRisk: false });
  });

  it("keeps the streak alive when the last entry is yesterday", () => {
    const dates = daysEndingAt(addDays(TODAY, -1), 3);
    const result = getStreak(dates, TODAY);
    expect(result).toEqual({ count: 3, activeToday: false, atRisk: true });
  });

  it("reports a single yesterday entry as at risk", () => {
    const result = getStreak([addDays(TODAY, -1)], TODAY);
    expect(result).toEqual({ count: 1, activeToday: false, atRisk: true });
  });

  it("resets to 0 after missing a full day", () => {
    const dates = daysEndingAt(addDays(TODAY, -2), 4);
    expect(getStreak(dates, TODAY)).toEqual({ count: 0, activeToday: false, atRisk: false });
  });

  it("does not count duplicate entries on the same day twice", () => {
    const dates = [...daysEndingAt(TODAY, 3), TODAY, TODAY, addDays(TODAY, -1)];
    expect(getStreak(dates, TODAY).count).toBe(3);
  });

  it("stops counting at a gap in the middle", () => {
    const dates = [TODAY, addDays(TODAY, -1), addDays(TODAY, -3), addDays(TODAY, -4)];
    expect(getStreak(dates, TODAY).count).toBe(2);
  });

  it("ignores time-of-day suffixes on stored dates", () => {
    const dates = [`${TODAY}T12:00:00.000Z`, `${addDays(TODAY, -1)}T08:30:00.000Z`];
    expect(getStreak(dates, TODAY).count).toBe(2);
  });

  it("counts a 30-day streak ending today", () => {
    expect(getStreak(daysEndingAt(TODAY, 30), TODAY).count).toBe(30);
  });

  it("counts a streak that spans a month boundary", () => {
    const dates = ["2026-03-02", "2026-03-01", "2026-02-28"];
    expect(getStreak(dates, "2026-03-02").count).toBe(3);
  });

  it("is unordered-input safe", () => {
    const dates = [addDays(TODAY, -2), TODAY, addDays(TODAY, -1)];
    expect(getStreak(dates, TODAY).count).toBe(3);
  });
});
