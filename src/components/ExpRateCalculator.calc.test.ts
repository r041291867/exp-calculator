import { describe, it, expect } from "vitest";
import { computeExpRateResult } from "./ExpRateCalculator.calc";

describe("computeExpRateResult", () => {
    it("returns null for non-positive duration or exp", () => {
        expect(computeExpRateResult(0, 1000, false, 1, 0)).toBeNull();
        expect(computeExpRateResult(40, 0, false, 1, 0)).toBeNull();
    });

    it("computes rates without prayer", () => {
        // 1000 exp over 40 min -> 25/min -> 10min=250, 60min=1500
        const result = computeExpRateResult(40, 1000, false, 1, 0);
        expect(result?.noPrayer10).toBe(250);
        expect(result?.noPrayer60).toBe(1500);
        // withPrayer applies the 1.25 multiplier on top of the no-prayer base rate
        expect(result?.withPrayer10).toBe(313);
        expect(result?.withPrayer60).toBe(1875);
    });

    it("treats the measured exp as already prayer-boosted when hasPrayer is set", () => {
        // hasPrayer divides totalExp by 1.25 first to recover the no-prayer base rate
        const result = computeExpRateResult(40, 1250, true, 1, 0);
        expect(result?.noPrayer10).toBe(250);
        expect(result?.noPrayer60).toBe(1500);
    });

    it("computes minutes to level up", () => {
        // level 1->2 needs 15 exp; base rate 25/min -> remaining 15 -> ceil(15/25)=1
        const result = computeExpRateResult(40, 1000, false, 1, 0);
        expect(result?.minsToLevelUp).toBe(1);
    });
});
