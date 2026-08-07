import { describe, it, expect, beforeEach } from "vitest";
import { BUFF_DEFAULTS, type BuffConfig } from "../utils/aura";
import {
    formatByDailyHours,
    calcRemaining,
    calcUnitsResult,
    calcDaysResult,
    calcDailyResult,
    calcSessionEffective,
    makeSessionConfig,
    migrateSessions,
    migrateRefBuffConfig,
    type SessionConfig,
} from "./Calculator.calc";

function makeMemoryStorage(): Storage {
    const store = new Map<string, string>();
    return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
        key: (index: number) => Array.from(store.keys())[index] ?? null,
        get length() {
            return store.size;
        },
    } as Storage;
}

function session(overrides: Partial<SessionConfig> = {}): SessionConfig {
    return { id: "s1", buffConfig: { ...BUFF_DEFAULTS }, hours: 1, loops: 1, ...overrides };
}

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

describe("calcSessionEffective", () => {
    it("returns 1 for a no-buff config regardless of hours", () => {
        expect(calcSessionEffective(BUFF_DEFAULTS, 3)).toBe(1);
    });

    it("applies hottime as a flat multiplier", () => {
        const buff: BuffConfig = { ...BUFF_DEFAULTS, hasHottime: true, hottimeMult: 2 };
        expect(calcSessionEffective(buff, 3)).toBe(2);
    });
});

describe("calcUnitsResult", () => {
    it("returns null when the reference efficiency inputs are non-positive", () => {
        expect(calcUnitsResult([session()], 0, 10, BUFF_DEFAULTS, 1, 0)).toBeNull();
        expect(calcUnitsResult([session()], 1000, 0, BUFF_DEFAULTS, 1, 0)).toBeNull();
    });

    it("returns null when every session contributes zero exp", () => {
        expect(calcUnitsResult([session({ hours: 0 })], 1000, 10, BUFF_DEFAULTS, 1, 0)).toBeNull();
    });

    it("matches the pre-buff linear behavior for a single no-buff session", () => {
        // 1 hour, 1000 exp per 10-min interval, no buffs anywhere -> 6 sessions -> 6000 exp gained
        const result = calcUnitsResult([session({ hours: 1 })], 1000, 10, BUFF_DEFAULTS, 1, 0);
        expect(result?.totalExpGained).toBe(6000);
        expect(result?.resultLevel).toBeGreaterThan(1);
        expect(result?.contributions).toEqual([{ id: "s1", effective: 1, expGained: 6000 }]);
    });

    it("backs out the base rate when the reference efficiency was measured with a buff", () => {
        // efficiency measured with hottime x2 -> baseExpPerMinute = (1000/2)/10 = 50/min
        // a session with the same hottime buff should reproduce the original 6000 exp for 1 hour
        const refBuff: BuffConfig = { ...BUFF_DEFAULTS, hasHottime: true, hottimeMult: 2 };
        const result = calcUnitsResult([session({ hours: 1, buffConfig: refBuff })], 1000, 10, refBuff, 1, 0);
        expect(result?.totalExpGained).toBe(6000);
    });

    it("sums contributions across multiple sessions and applies loops as a flat multiplier", () => {
        // baseExpPerMinute = 1000/10 = 100/min (no ref buff)
        // session A: 1h, no buff, loop 1 -> 100*1*60*1 = 6000
        // session B: 1h, hottime x2, loop 10 -> 100*2*60*10 = 120000
        const sessions = [
            session({ id: "a", hours: 1, loops: 1 }),
            session({ id: "b", hours: 1, loops: 10, buffConfig: { ...BUFF_DEFAULTS, hasHottime: true, hottimeMult: 2 } }),
        ];
        const result = calcUnitsResult(sessions, 1000, 10, BUFF_DEFAULTS, 1, 0);
        expect(result?.contributions).toEqual([
            { id: "a", effective: 1, expGained: 6000 },
            { id: "b", effective: 2, expGained: 120000 },
        ]);
        expect(result?.totalExpGained).toBe(126000);
    });

    it("skips a zero-hour session without blocking the others", () => {
        const sessions = [session({ id: "empty", hours: 0 }), session({ id: "filled", hours: 1 })];
        const result = calcUnitsResult(sessions, 1000, 10, BUFF_DEFAULTS, 1, 0);
        expect(result?.contributions).toEqual([
            { id: "empty", effective: 1, expGained: 0 },
            { id: "filled", effective: 1, expGained: 6000 },
        ]);
        expect(result?.totalExpGained).toBe(6000);
    });
});

describe("migrateRefBuffConfig", () => {
    beforeEach(() => {
        globalThis.localStorage = makeMemoryStorage();
    });

    it("returns defaults on a fresh install", () => {
        expect(migrateRefBuffConfig()).toEqual(BUFF_DEFAULTS);
    });

    it("returns the existing stored config untouched", () => {
        const existing: BuffConfig = { ...BUFF_DEFAULTS, hasPrayer: true };
        localStorage.setItem("calc.refBuffConfig", JSON.stringify(existing));
        expect(migrateRefBuffConfig()).toEqual(existing);
    });
});

describe("migrateSessions", () => {
    beforeEach(() => {
        globalThis.localStorage = makeMemoryStorage();
    });

    it("defaults to a single 1-hour no-buff session on a fresh install", () => {
        const result = migrateSessions();
        expect(result).toHaveLength(1);
        expect(result[0].hours).toBe(1);
        expect(result[0].loops).toBe(1);
        expect(result[0].buffConfig).toEqual(BUFF_DEFAULTS);
    });

    it("carries the legacy calc.hours value into the first session", () => {
        localStorage.setItem("calc.hours", JSON.stringify(3.5));
        const result = migrateSessions();
        expect(result).toHaveLength(1);
        expect(result[0].hours).toBe(3.5);
    });

    it("leaves an already-migrated session list untouched", () => {
        const existing = [makeSessionConfig(2)];
        localStorage.setItem("calc.sessions", JSON.stringify(existing));
        expect(migrateSessions()).toEqual(existing);
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
