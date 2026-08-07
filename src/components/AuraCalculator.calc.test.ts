import { describe, it, expect } from "vitest";
import { computeAuraResult } from "./AuraCalculator.calc";

describe("computeAuraResult", () => {
    it("returns null for non-positive total time", () => {
        expect(computeAuraResult(0, 15, 2, 2, false)).toBeNull();
    });

    it("returns invalid when aura time exceeds total time", () => {
        const result = computeAuraResult(10, 15, 2, 2, false);
        expect(result).toEqual({ valid: false, auraTime: 30 });
    });

    it("computes the effective multiplier and average without prayer", () => {
        // totalTime=100, triggers=8, duration=3 -> auraTime=24; multiplier=2.2
        const result = computeAuraResult(100, 8, 3, 2.2, true);
        expect(result?.valid).toBe(true);
        if (result?.valid) {
            expect(result.auraTime).toBe(24);
            expect(result.auraPercent).toBe(24);
            expect(result.avgWithoutPrayer).toBeCloseTo(1.288, 5);
            expect(result.effective).toBeCloseTo(1.538, 5);
        }
    });

    it("effective equals avgWithoutPrayer when prayer is off", () => {
        const result = computeAuraResult(100, 8, 3, 2.2, false);
        if (result?.valid) {
            expect(result.effective).toBe(result.avgWithoutPrayer);
        }
    });
});
