import { describe, it, expect, beforeEach } from "vitest";
import {
    BUFF_DEFAULTS,
    migratePrimaryBuffConfig,
    migrateR2BuffConfig,
    computeBaseRateResult,
    type BuffConfig,
} from "./BaseRateCalculator.calc";

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

beforeEach(() => {
    globalThis.localStorage = makeMemoryStorage();
});

describe("migratePrimaryBuffConfig", () => {
    it("returns defaults on a fresh install with nothing stored", () => {
        expect(migratePrimaryBuffConfig()).toEqual(BUFF_DEFAULTS);
    });

    it("returns the existing base.buffConfig value untouched if already migrated", () => {
        const existing: BuffConfig = { ...BUFF_DEFAULTS, hasPrayer: true, auraMultiplier: 3 };
        localStorage.setItem("base.buffConfig", JSON.stringify(existing));
        expect(migratePrimaryBuffConfig()).toEqual(existing);
    });

    it("migrates legacy keys into the new shape and deletes them", () => {
        localStorage.setItem("base.hottime", JSON.stringify(true));
        localStorage.setItem("base.hottimeMult", JSON.stringify(3));
        localStorage.setItem("base.hasAura", JSON.stringify(true));
        localStorage.setItem("base.auraTriggers", JSON.stringify(10));
        localStorage.setItem("base.auraDuration", JSON.stringify(1.5));
        localStorage.setItem("base.auraMultiplier", JSON.stringify(2.5));
        localStorage.setItem("base.prayer", JSON.stringify(true));
        localStorage.setItem("base.doubleCard", JSON.stringify(false));

        const result = migratePrimaryBuffConfig();

        expect(result).toEqual({
            hasHottime: true,
            hottimeMult: 3,
            hasAura: true,
            auraTriggers: 10,
            auraDuration: 1.5,
            auraMultiplier: 2.5,
            hasPrayer: true,
            hasDoubleCard: false,
        });
        expect(localStorage.getItem("base.hottime")).toBeNull();
        expect(localStorage.getItem("base.hottimeMult")).toBeNull();
        expect(localStorage.getItem("base.hasAura")).toBeNull();
        expect(localStorage.getItem("base.auraTriggers")).toBeNull();
        expect(localStorage.getItem("base.auraDuration")).toBeNull();
        expect(localStorage.getItem("base.auraMultiplier")).toBeNull();
        expect(localStorage.getItem("base.prayer")).toBeNull();
        expect(localStorage.getItem("base.doubleCard")).toBeNull();
    });

    it("fills missing legacy fields with defaults", () => {
        localStorage.setItem("base.hottime", JSON.stringify(true));
        const result = migratePrimaryBuffConfig();
        expect(result).toEqual({ ...BUFF_DEFAULTS, hasHottime: true });
    });
});

describe("migrateR2BuffConfig", () => {
    it("returns defaults when nothing stored", () => {
        expect(migrateR2BuffConfig()).toEqual(BUFF_DEFAULTS);
    });

    it("renames the legacy auraMult field to auraMultiplier", () => {
        localStorage.setItem(
            "base.r2.config",
            JSON.stringify({
                hasDoubleCard: false,
                hasPrayer: true,
                hasHottime: false,
                hottimeMult: 2,
                hasAura: true,
                auraTriggers: 20,
                auraDuration: 2,
                auraMult: 1.75,
            }),
        );

        expect(migrateR2BuffConfig()).toEqual({
            hasHottime: false,
            hottimeMult: 2,
            hasAura: true,
            auraTriggers: 20,
            auraDuration: 2,
            auraMultiplier: 1.75,
            hasPrayer: true,
            hasDoubleCard: false,
        });
    });

    it("leaves an already-migrated shape untouched", () => {
        const migrated: BuffConfig = { ...BUFF_DEFAULTS, auraMultiplier: 1.75, hasDoubleCard: true };
        localStorage.setItem("base.r2.config", JSON.stringify(migrated));
        expect(migrateR2BuffConfig()).toEqual(migrated);
    });
});

describe("computeBaseRateResult", () => {
    const primary: BuffConfig = { ...BUFF_DEFAULTS };
    const r2: BuffConfig = { ...BUFF_DEFAULTS };

    it("returns null when duration is non-positive", () => {
        expect(computeBaseRateResult(primary, r2, 0, 1000, false, 1, 0)).toBeNull();
    });

    it("returns an error when aura time exceeds the statistic window", () => {
        const withAura: BuffConfig = { ...BUFF_DEFAULTS, hasAura: true, auraTriggers: 10, auraDuration: 10 };
        const result = computeBaseRateResult(withAura, r2, 60, 1000, false, 1, 0);
        expect(result?.type).toBe("error");
    });

    it("returns mult-only when onlyEffectiveMult is set", () => {
        const result = computeBaseRateResult(primary, r2, 60, 1000, true, 1, 0);
        expect(result?.type).toBe("mult-only");
    });

    it("returns mult-only when totalExp is zero", () => {
        const result = computeBaseRateResult(primary, r2, 60, 0, false, 1, 0);
        expect(result?.type).toBe("mult-only");
    });

    it("computes ok rates for plain (no-buff) config", () => {
        // no buffs -> effective = 1; totalExp=6000 over 60 min -> 100/min -> rate10=1000, rate60=6000
        const result = computeBaseRateResult(primary, r2, 60, 6000, false, 1, 0);
        expect(result?.type).toBe("ok");
        if (result?.type === "ok") {
            expect(result.effective).toBe(1);
            expect(result.spot10).toBe(1000);
            expect(result.spot60).toBe(6000);
        }
    });

    it("computes independent effective multipliers for primary and r2", () => {
        const hotPrimary: BuffConfig = { ...BUFF_DEFAULTS, hasHottime: true, hottimeMult: 2 };
        const prayerR2: BuffConfig = { ...BUFF_DEFAULTS, hasPrayer: true };
        const result = computeBaseRateResult(hotPrimary, prayerR2, 60, 6000, false, 1, 0);
        expect(result?.type).toBe("ok");
        if (result?.type === "ok") {
            expect(result.effective).toBe(2);
            expect(result.r2Effective).toBe(1.25);
        }
    });
});
