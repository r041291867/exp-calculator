import { minutesToLevelUp } from "../data/expTable";
import { calcEffective, calcAuraTime, type BuffConfig, BUFF_DEFAULTS } from "../utils/aura";

export function readJSON<T>(key: string): T | null {
    try {
        const item = localStorage.getItem(key);
        return item !== null ? (JSON.parse(item) as T) : null;
    } catch {
        return null;
    }
}

export const PRIMARY_BUFF_CONFIG_KEY = "base.buffConfig";
export const PRIMARY_LEGACY_KEYS = [
    "base.hottime",
    "base.hottimeMult",
    "base.hasAura",
    "base.auraTriggers",
    "base.auraDuration",
    "base.auraMultiplier",
    "base.prayer",
    "base.doubleCard",
] as const;

export function migratePrimaryBuffConfig(): BuffConfig {
    const existing = readJSON<BuffConfig>(PRIMARY_BUFF_CONFIG_KEY);
    if (existing) return existing;

    const hasLegacyData = PRIMARY_LEGACY_KEYS.some((key) => localStorage.getItem(key) !== null);
    if (!hasLegacyData) return BUFF_DEFAULTS;

    const config: BuffConfig = {
        hasHottime: readJSON<boolean>("base.hottime") ?? BUFF_DEFAULTS.hasHottime,
        hottimeMult: readJSON<number>("base.hottimeMult") ?? BUFF_DEFAULTS.hottimeMult,
        hasAura: readJSON<boolean>("base.hasAura") ?? BUFF_DEFAULTS.hasAura,
        auraTriggers: readJSON<number>("base.auraTriggers") ?? BUFF_DEFAULTS.auraTriggers,
        auraDuration: readJSON<number>("base.auraDuration") ?? BUFF_DEFAULTS.auraDuration,
        auraMultiplier: readJSON<number>("base.auraMultiplier") ?? BUFF_DEFAULTS.auraMultiplier,
        hasPrayer: readJSON<boolean>("base.prayer") ?? BUFF_DEFAULTS.hasPrayer,
        hasDoubleCard: readJSON<boolean>("base.doubleCard") ?? BUFF_DEFAULTS.hasDoubleCard,
    };

    PRIMARY_LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
    return config;
}

export const R2_BUFF_CONFIG_KEY = "base.r2.config";

export function migrateR2BuffConfig(): BuffConfig {
    const legacy = readJSON<Record<string, unknown>>(R2_BUFF_CONFIG_KEY);
    if (!legacy) return BUFF_DEFAULTS;

    if (typeof legacy.auraMultiplier === "number") {
        return { ...BUFF_DEFAULTS, ...legacy } as BuffConfig;
    }

    const { auraMult, ...rest } = legacy;
    return {
        ...BUFF_DEFAULTS,
        ...rest,
        auraMultiplier: typeof auraMult === "number" ? auraMult : BUFF_DEFAULTS.auraMultiplier,
    } as BuffConfig;
}

export type BaseRateResult =
    | { type: "error"; msg: string }
    | { type: "mult-only"; effective: number; r2Effective: number }
    | {
          type: "ok";
          effective: number;
          spot10: number;
          spot60: number;
          minsToLevelUpSpot: number;
          r2Effective: number;
          r2Rate10: number;
          r2Rate60: number;
          minsToLevelUpR2: number;
      };

export function computeBaseRateResult(
    buffConfig: BuffConfig,
    r2Config: BuffConfig,
    durationMinutes: number,
    totalExp: number,
    onlyEffectiveMult: boolean,
    currentLevel: number,
    currentExp: number,
): BaseRateResult | null {
    if (durationMinutes <= 0) return null;

    const auraTime = calcAuraTime(buffConfig.hasAura, buffConfig.auraTriggers, buffConfig.auraDuration);
    if (auraTime > durationMinutes) {
        return { type: "error", msg: `氣場時間（${auraTime} 分）超過統計時間（${durationMinutes} 分）` };
    }

    const effective = calcEffective({ ...buffConfig, durationMinutes });
    const r2Effective = calcEffective({ ...r2Config, durationMinutes });

    if (onlyEffectiveMult || totalExp <= 0) {
        return { type: "mult-only", effective, r2Effective };
    }

    const base1xPerMin = totalExp / durationMinutes / effective;
    const spot10 = Math.round(base1xPerMin * effective * 10);
    const spot60 = Math.round(base1xPerMin * effective * 60);

    const r2Rate = base1xPerMin * r2Effective;
    const r2Rate10 = Math.round(r2Rate * 10);
    const r2Rate60 = Math.round(r2Rate * 60);

    const minsToLevelUpSpot = minutesToLevelUp(currentLevel, currentExp, base1xPerMin * effective);
    const minsToLevelUpR2 = minutesToLevelUp(currentLevel, currentExp, r2Rate);

    return {
        type: "ok",
        effective,
        spot10,
        spot60,
        minsToLevelUpSpot,
        r2Effective,
        r2Rate10,
        r2Rate60,
        minsToLevelUpR2,
    };
}
