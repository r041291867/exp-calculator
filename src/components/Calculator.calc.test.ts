import { describe, it, expect } from "vitest";
import { formatByDailyHours, calcRemaining, calcUnitsResult, calcDaysResult, calcDailyResult } from "./Calculator.calc";

describe("formatByDailyHours", () => {
    it("formats minutes under an hour", () => {
        expect(formatByDailyHours(30, 2)).toBe("30分鐘");
    });

    it("formats hours and minutes without full days", () => {
        expect(formatByDailyHours(90, 2)).toBe("1小時30分鐘");
    });

    it("formats full days plus remainder", () => {
        // dailyHours=2 -> dailyMins=120; 250 mins = 2*120 + 10
        expect(formatByDailyHours(250, 2)).toBe("2天10分鐘");
    });

    it("formats exact full days with no remainder", () => {
        expect(formatByDailyHours(240, 2)).toBe("2天");
    });

    it("returns 0 minutes for non-positive input", () => {
        expect(formatByDailyHours(0, 2)).toBe("0 分鐘");
        expect(formatByDailyHours(-5, 2)).toBe("0 分鐘");
    });
});

describe("calcRemaining", () => {
    it("returns null when target is not above current level", () => {
        expect(calcRemaining(10, 0, 10)).toBeNull();
        expect(calcRemaining(10, 0, 5)).toBeNull();
    });

    it("computes remaining exp to the target level", () => {
        // level 1 -> level 2 needs 15 exp total (cumulativeExp), with 5 exp already at level 1
        expect(calcRemaining(1, 5, 2)).toBe(10);
    });
});

describe("calcUnitsResult", () => {
    it("returns null for non-positive inputs", () => {
        expect(calcUnitsResult(0, 1000, 10, 1, 0)).toBeNull();
        expect(calcUnitsResult(1, 0, 10, 1, 0)).toBeNull();
        expect(calcUnitsResult(1, 1000, 0, 1, 0)).toBeNull();
    });

    it("computes total exp gained and resulting level", () => {
        // 1 hour, 1000 exp per 10-min interval -> 6 sessions -> 6000 exp gained
        const result = calcUnitsResult(1, 1000, 10, 1, 0);
        expect(result?.totalExpGained).toBe(6000);
        // level 1 cum=0, +6000 exp -> well past level 1 (needs 15) into higher levels
        expect(result?.resultLevel).toBeGreaterThan(1);
    });
});

describe("calcDaysResult", () => {
    it("returns null when remaining is null", () => {
        expect(calcDaysResult(null, 10, 1000)).toBeNull();
    });

    it("computes total minutes needed", () => {
        // 5000 remaining exp, 1000 exp per 10 min -> 5 sessions -> 50 minutes
        expect(calcDaysResult(5000, 10, 1000)).toEqual({ remaining: 5000, totalMinutes: 50 });
    });
});

describe("calcDailyResult", () => {
    it("returns null when remaining or dates are missing", () => {
        expect(calcDailyResult(null, "2026-01-01", "2026-01-05", 1000, 10)).toBeNull();
        expect(calcDailyResult(5000, "", "2026-01-05", 1000, 10)).toBeNull();
        expect(calcDailyResult(5000, "2026-01-01", "", 1000, 10)).toBeNull();
    });

    it("returns an error when end date is before start date", () => {
        const result = calcDailyResult(5000, "2026-01-05", "2026-01-01", 1000, 10);
        expect(result && "error" in result).toBe(true);
    });

    it("computes days (inclusive) and exp/minutes per day", () => {
        // Jan 1 to Jan 5 inclusive = 5 days
        const result = calcDailyResult(5000, "2026-01-01", "2026-01-05", 1000, 10);
        expect(result).toEqual({ remaining: 5000, days: 5, expPerDay: 1000, minutesPerDay: 10 });
    });
});
