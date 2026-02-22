import {
  getToday,
  getDaysAgo,
  getDaysBetween,
  getLast30Days,
  isToday,
  parseTime,
  calculateStreak,
} from "../utils/dateUtils";

describe("dateUtils", () => {
  test("getToday returns YYYY-MM-DD format", () => {
    const today = getToday();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("getDaysAgo(0) returns today", () => {
    expect(getDaysAgo(0)).toBe(getToday());
  });

  test("getDaysAgo(1) returns yesterday", () => {
    const yesterday = getDaysAgo(1);
    const today = getToday();
    expect(getDaysBetween(yesterday, today)).toBe(1);
  });

  test("getDaysBetween calculates correctly", () => {
    expect(getDaysBetween("2024-01-01", "2024-01-10")).toBe(9);
    expect(getDaysBetween("2024-01-01", "2024-01-01")).toBe(0);
  });

  test("getLast30Days returns 30 items", () => {
    const days = getLast30Days();
    expect(days).toHaveLength(30);
    expect(days[29]).toBe(getToday());
  });

  test("isToday identifies today correctly", () => {
    expect(isToday(getToday())).toBe(true);
    expect(isToday("2020-01-01")).toBe(false);
  });

  test("parseTime parses HH:mm format", () => {
    expect(parseTime("07:30")).toEqual({ hours: 7, minutes: 30 });
    expect(parseTime("21:00")).toEqual({ hours: 21, minutes: 0 });
  });

  test("calculateStreak with no records returns 0", () => {
    expect(calculateStreak({})).toBe(0);
  });

  test("calculateStreak counts consecutive days", () => {
    const records: Record<
      string,
      { morningComplete: boolean; eveningComplete: boolean }
    > = {};
    for (let i = 1; i <= 5; i++) {
      records[getDaysAgo(i)] = {
        morningComplete: true,
        eveningComplete: true,
      };
    }
    expect(calculateStreak(records)).toBe(5);
  });

  test("calculateStreak breaks on missed day", () => {
    const records: Record<
      string,
      { morningComplete: boolean; eveningComplete: boolean }
    > = {};
    records[getDaysAgo(1)] = {
      morningComplete: true,
      eveningComplete: true,
    };
    records[getDaysAgo(2)] = {
      morningComplete: true,
      eveningComplete: true,
    };
    // Skip day 3
    records[getDaysAgo(4)] = {
      morningComplete: true,
      eveningComplete: true,
    };
    expect(calculateStreak(records)).toBe(2);
  });
});
