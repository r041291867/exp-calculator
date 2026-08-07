export interface EffectiveConfig {
    hasHottime: boolean;
    hottimeMult: number;
    hasAura: boolean;
    auraTriggers: number;
    auraDuration: number;
    auraMultiplier: number;
    durationMinutes: number;
    hasPrayer: boolean;
    hasDoubleCard: boolean;
}

export type BuffConfig = Omit<EffectiveConfig, "durationMinutes">;

export const BUFF_DEFAULTS: BuffConfig = {
    hasHottime: false,
    hottimeMult: 2,
    hasAura: false,
    auraTriggers: 15,
    auraDuration: 2,
    auraMultiplier: 2,
    hasPrayer: false,
    hasDoubleCard: false,
};

export function calcAuraTime(hasAura: boolean, auraTriggers: number, auraDuration: number): number {
    return hasAura ? auraTriggers * auraDuration : 0;
}

export function calcEffective(cfg: EffectiveConfig): number {
    const auraTime = calcAuraTime(cfg.hasAura, cfg.auraTriggers, cfg.auraDuration);
    const auraFraction = cfg.durationMinutes > 0 ? Math.min(1, auraTime / cfg.durationMinutes) : 0;
    const hottimeBase = cfg.hasHottime ? cfg.hottimeMult : 1;
    const effNoPrayer = hottimeBase + (cfg.auraMultiplier - 1) * auraFraction;
    return effNoPrayer + (cfg.hasPrayer ? 0.25 : 0) + (cfg.hasDoubleCard ? 1 : 0);
}
