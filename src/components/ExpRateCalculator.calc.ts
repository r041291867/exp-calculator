import { minutesToLevelUp } from "../data/expTable";

export const PRAYER_MULT = 1.25;

export interface ExpRateResult {
    noPrayer10: number;
    noPrayer60: number;
    withPrayer10: number;
    withPrayer60: number;
    minsToLevelUp: number;
}

export function computeExpRateResult(
    durationMinutes: number,
    totalExp: number,
    hasPrayer: boolean,
    currentLevel: number,
    currentExp: number,
): ExpRateResult | null {
    if (durationMinutes <= 0 || totalExp <= 0) return null;

    const basePerMin = hasPrayer ? totalExp / PRAYER_MULT / durationMinutes : totalExp / durationMinutes;

    const noPrayer10 = Math.round(basePerMin * 10);
    const noPrayer60 = Math.round(basePerMin * 60);
    const withPrayer10 = Math.round(basePerMin * PRAYER_MULT * 10);
    const withPrayer60 = Math.round(basePerMin * PRAYER_MULT * 60);

    const minsToLevelUp = minutesToLevelUp(currentLevel, currentExp, basePerMin);

    return { noPrayer10, noPrayer60, withPrayer10, withPrayer60, minsToLevelUp };
}
