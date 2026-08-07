import { calcEffective, calcAuraTime } from "../utils/aura";

export type AuraResult =
    | { valid: false; auraTime: number }
    | { valid: true; effective: number; avgWithoutPrayer: number; auraTime: number; auraPercent: number };

export function computeAuraResult(
    totalTime: number,
    auraTriggers: number,
    auraDuration: number,
    auraMultiplier: number,
    hasPrayer: boolean,
): AuraResult | null {
    if (totalTime <= 0) return null;

    const auraTime = calcAuraTime(true, auraTriggers, auraDuration);
    if (auraTime > totalTime) {
        return { valid: false, auraTime };
    }

    const cfgBase = {
        hasHottime: false,
        hottimeMult: 1,
        hasAura: true,
        auraTriggers,
        auraDuration,
        auraMultiplier,
        durationMinutes: totalTime,
        hasDoubleCard: false,
    };
    const effective = calcEffective({ ...cfgBase, hasPrayer });
    const avgWithoutPrayer = calcEffective({ ...cfgBase, hasPrayer: false });
    const auraPercent = Math.round((auraTime / totalTime) * 100);

    return { valid: true, effective, avgWithoutPrayer, auraTime, auraPercent };
}
