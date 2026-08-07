import { describe, it, expect } from "vitest";
import { EXP_TABLE, getExpToNext, getCumulativeExp, getLevelFromCumExp, minutesToLevelUp } from "./expTable";

describe("getLevelFromCumExp", () => {
    it("returns level 1 at zero exp", () => {
        expect(getLevelFromCumExp(0)).toEqual({ level: 1, expIntoLevel: 0, expToNext: 15 });
    });

    it("returns exp progress within a level", () => {
        expect(getLevelFromCumExp(14)).toEqual({ level: 1, expIntoLevel: 14, expToNext: 15 });
    });

    it("lands exactly on a level boundary", () => {
        expect(getLevelFromCumExp(15)).toEqual({ level: 2, expIntoLevel: 0, expToNext: 34 });
    });

    it("caps at level 200 for exp beyond the table", () => {
        const maxEntry = EXP_TABLE[EXP_TABLE.length - 1];
        const result = getLevelFromCumExp(maxEntry.cumulativeExp + 1_000_000);
        expect(result.level).toBe(200);
        expect(result.expIntoLevel).toBe(1_000_000);
    });

    it("matches a brute-force linear scan at every table boundary", () => {
        function linearScan(cumExp: number) {
            let resultLevel = 1;
            let resultCumExp = 0;
            for (const entry of EXP_TABLE) {
                if (entry.cumulativeExp > cumExp) break;
                resultLevel = entry.level;
                resultCumExp = entry.cumulativeExp;
            }
            return { level: resultLevel, expIntoLevel: cumExp - resultCumExp, expToNext: getExpToNext(resultLevel) };
        }

        for (const entry of EXP_TABLE) {
            for (const delta of [-1, 0, 1]) {
                const cumExp = entry.cumulativeExp + delta;
                if (cumExp < 0) continue;
                expect(getLevelFromCumExp(cumExp)).toEqual(linearScan(cumExp));
            }
        }
    });
});

describe("minutesToLevelUp", () => {
    it("returns 0 when already at or past the target", () => {
        expect(minutesToLevelUp(1, 15, 10)).toBe(0);
    });

    it("rounds up to the nearest whole minute", () => {
        // level 1 -> 2 needs 15 exp; with 3 exp already and rate 4/min: remaining 12, 12/4 = 3 mins exactly
        expect(minutesToLevelUp(1, 3, 4)).toBe(3);
        // remaining 12, rate 5/min -> 2.4 -> ceil to 3
        expect(minutesToLevelUp(1, 3, 5)).toBe(3);
    });

    it("returns 0 when the rate is zero or negative", () => {
        expect(minutesToLevelUp(1, 0, 0)).toBe(0);
        expect(minutesToLevelUp(1, 0, -5)).toBe(0);
    });
});

describe("getCumulativeExp / getExpToNext", () => {
    it("round-trips through getLevelFromCumExp", () => {
        const level = 42;
        const cum = getCumulativeExp(level);
        expect(getLevelFromCumExp(cum)).toEqual({ level, expIntoLevel: 0, expToNext: getExpToNext(level) });
    });
});
