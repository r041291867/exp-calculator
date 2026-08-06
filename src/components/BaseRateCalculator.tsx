import { useMemo, useEffect, useState } from "react";
import { getExpToNext } from "../data/expTable";
import type { SharedLevelExp } from "../hooks/useLevelExp";
import { useTotalExp } from "../hooks/useTotalExp";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { formatNumber, formatMins } from "../utils/format";
import { calcEffective, calcAuraTime } from "../utils/aura";
import ExpAmountField from "./shared/ExpAmountField";
import AuraFields from "./shared/AuraFields";
import PrayerCheckbox from "./shared/PrayerCheckbox";
import CollapsibleCard from "./shared/CollapsibleCard";
import Tooltip from "./shared/Tooltip";

interface BaseRateProps extends SharedLevelExp {
    onRateClick?: (mins: number, exp: number) => void;
}

interface HottimeFieldProps {
    checked: boolean;
    onCheckedChange: (v: boolean) => void;
    multiplier: number;
    onMultiplierChange: (v: number) => void;
}

function HottimeField({ checked, onCheckedChange, multiplier, onMultiplierChange }: HottimeFieldProps) {
    return (
        <div className="field">
            <div className="buff-row">
                <label className="prayer-checkbox-row">
                    <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} />
                    <span>Hot Time</span>
                </label>
                {checked && (
                    <div className="buff-inline-input">
                        <input
                            type="number"
                            min={1}
                            step={0.25}
                            value={multiplier || ""}
                            onChange={(e) => onMultiplierChange(Number(e.target.value))}
                            onBlur={() => onMultiplierChange(Math.max(1, multiplier || 1))}
                        />
                        <span className="unit-label">倍</span>
                    </div>
                )}
            </div>
        </div>
    );
}

interface RateSgProps {
    rate10: number;
    rate60: number;
    clickable: boolean;
    onRateClick?: (mins: number, exp: number) => void;
}

function RateSg({ rate10, rate60, clickable, onRateClick }: RateSgProps) {
    return (
        <div className="rate-sg">
            <div className="rate-grid-label">10 分鐘</div>
            <div
                className={`rate-grid-value${clickable ? " rate-sg-clickable" : ""}`}
                onClick={clickable ? () => onRateClick!(10, rate10) : undefined}
            >
                {formatNumber(rate10)}
            </div>
            <div className="rate-grid-label">60 分鐘</div>
            <div
                className={`rate-grid-value${clickable ? " rate-sg-clickable" : ""}`}
                onClick={clickable ? () => onRateClick!(60, rate60) : undefined}
            >
                {formatNumber(rate60)}
            </div>
        </div>
    );
}

interface BuffConfig {
    hasHottime: boolean;
    hottimeMult: number;
    hasAura: boolean;
    auraTriggers: number;
    auraDuration: number;
    auraMultiplier: number;
    hasPrayer: boolean;
    hasDoubleCard: boolean;
}

const BUFF_DEFAULTS: BuffConfig = {
    hasHottime: false,
    hottimeMult: 2,
    hasAura: false,
    auraTriggers: 15,
    auraDuration: 2,
    auraMultiplier: 2,
    hasPrayer: false,
    hasDoubleCard: false,
};

function readJSON<T>(key: string): T | null {
    try {
        const item = localStorage.getItem(key);
        return item !== null ? (JSON.parse(item) as T) : null;
    } catch {
        return null;
    }
}

const PRIMARY_BUFF_CONFIG_KEY = "base.buffConfig";
const PRIMARY_LEGACY_KEYS = [
    "base.hottime",
    "base.hottimeMult",
    "base.hasAura",
    "base.auraTriggers",
    "base.auraDuration",
    "base.auraMultiplier",
    "base.prayer",
    "base.doubleCard",
] as const;

function migratePrimaryBuffConfig(): BuffConfig {
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

const R2_BUFF_CONFIG_KEY = "base.r2.config";

function migrateR2BuffConfig(): BuffConfig {
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

function useBuffConfig(
    key: string,
    migrate: () => BuffConfig,
): [BuffConfig, <K extends keyof BuffConfig>(field: K, value: BuffConfig[K]) => void] {
    const [config, setConfig] = useState<BuffConfig>(migrate);

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(config));
        } catch {}
    }, [key, config]);

    const setField = <K extends keyof BuffConfig>(field: K, value: BuffConfig[K]) =>
        setConfig((prev) => ({ ...prev, [field]: value }));

    return [config, setField];
}

export default function BaseRateCalculator({ currentLevel, currentExp, expToNextLevel, onRateClick }: BaseRateProps) {
    const {
        totalExp,
        setTotalExp,
        totalExpInputMode,
        setTotalExpInputMode,
        totalExpPercentValue,
        handleTotalExpChange,
    } = useTotalExp(expToNextLevel, 100000, "base");

    const [durationMinutes, setDurationMinutes] = useLocalStorage("base.duration", 60);
    const [onlyEffectiveMult, setOnlyEffectiveMult] = useLocalStorage("base.onlyEffMult", false);

    const [buffConfig, setBuffField] = useBuffConfig(PRIMARY_BUFF_CONFIG_KEY, migratePrimaryBuffConfig);

    const [r2Collapsed, setR2Collapsed] = useLocalStorage("base.r2.collapsed", true);
    const [r2Config, setR2Field] = useBuffConfig(R2_BUFF_CONFIG_KEY, migrateR2BuffConfig);

    useEffect(() => {
        setTotalExp(0);
    }, [currentLevel]);

    const result = useMemo(() => {
        if (durationMinutes <= 0) return null;

        const auraTime = calcAuraTime(buffConfig.hasAura, buffConfig.auraTriggers, buffConfig.auraDuration);
        if (auraTime > durationMinutes) {
            return { type: "error" as const, msg: `氣場時間（${auraTime} 分）超過統計時間（${durationMinutes} 分）` };
        }

        const effective = calcEffective({ ...buffConfig, durationMinutes });
        const r2Effective = calcEffective({ ...r2Config, durationMinutes });

        if (onlyEffectiveMult || totalExp <= 0) {
            return { type: "mult-only" as const, effective, r2Effective };
        }

        const base1xPerMin = totalExp / durationMinutes / effective;
        const spot10 = Math.round(base1xPerMin * effective * 10);
        const spot60 = Math.round(base1xPerMin * effective * 60);

        const r2Rate = base1xPerMin * r2Effective;
        const r2Rate10 = Math.round(r2Rate * 10);
        const r2Rate60 = Math.round(r2Rate * 60);

        const remaining = Math.max(0, getExpToNext(currentLevel) - currentExp);
        const minsToLevelUpSpot = remaining > 0 ? Math.ceil(remaining / (base1xPerMin * effective)) : 0;
        const minsToLevelUpR2 = remaining > 0 && r2Rate > 0 ? Math.ceil(remaining / r2Rate) : 0;

        return {
            type: "ok" as const,
            effective,
            spot10,
            spot60,
            minsToLevelUpSpot,
            r2Effective,
            r2Rate10,
            r2Rate60,
            minsToLevelUpR2,
        };
    }, [durationMinutes, totalExp, buffConfig, r2Config, onlyEffectiveMult, currentLevel, currentExp]);

    const clickable = !!onRateClick;

    return (
        <CollapsibleCard storageKey="base.collapsed" icon="⚡" title="經驗效率分析" className="card-full">
            <div className="form-body">
                <div className="field">
                    <label className="prayer-checkbox-row">
                        <input
                            type="checkbox"
                            checked={onlyEffectiveMult}
                            onChange={(e) => setOnlyEffectiveMult(e.target.checked)}
                        />
                        <span>僅計算等效倍率</span>
                    </label>
                </div>

                <div className="field">
                    <label>統計時間（分鐘）</label>
                    <input
                        type="number"
                        min={1}
                        value={durationMinutes || ""}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        onBlur={() => setDurationMinutes((v) => Math.max(1, v || 1))}
                    />
                </div>

                {!onlyEffectiveMult && (
                    <ExpAmountField
                        labelBase="統計期間獲得經驗"
                        currentLevel={currentLevel}
                        value={totalExp}
                        percentValue={totalExpPercentValue}
                        mode={totalExpInputMode}
                        onModeChange={setTotalExpInputMode}
                        onChange={handleTotalExpChange}
                    />
                )}
            </div>

            <div className="rate-results-row">
                <div className="rate-col">
                    <h2 className="rate-result-title">統計期間倍率設定</h2>

                    <div className="rate-col-form">
                        <PrayerCheckbox checked={buffConfig.hasPrayer} onChange={(v) => setBuffField("hasPrayer", v)} />
                        <PrayerCheckbox
                            checked={buffConfig.hasDoubleCard}
                            onChange={(v) => setBuffField("hasDoubleCard", v)}
                            label="加倍卷"
                        />

                        <HottimeField
                            checked={buffConfig.hasHottime}
                            onCheckedChange={(v) => setBuffField("hasHottime", v)}
                            multiplier={buffConfig.hottimeMult}
                            onMultiplierChange={(v) => setBuffField("hottimeMult", v)}
                        />

                        <div className="field">
                            <label className="prayer-checkbox-row">
                                <input
                                    type="checkbox"
                                    checked={buffConfig.hasAura}
                                    onChange={(e) => setBuffField("hasAura", e.target.checked)}
                                />
                                <span>氣場</span>
                            </label>
                        </div>

                        {buffConfig.hasAura && (
                            <AuraFields
                                triggers={buffConfig.auraTriggers}
                                onTriggersChange={(v) => setBuffField("auraTriggers", v)}
                                duration={buffConfig.auraDuration}
                                onDurationChange={(v) => setBuffField("auraDuration", v)}
                                multiplier={buffConfig.auraMultiplier}
                                onMultiplierChange={(v) => setBuffField("auraMultiplier", v)}
                            />
                        )}
                    </div>

                    {result && (result.type === "ok" || result.type === "mult-only") && (
                        <div className="rate-col-mult">
                            <span className="effective-mult-label">有效倍率</span>
                            <span className="effective-mult-value">×{result.effective.toFixed(3)}</span>
                        </div>
                    )}

                    {!onlyEffectiveMult &&
                        (!result ? (
                            <p className="no-result">請輸入統計時間和經驗值</p>
                        ) : result.type === "error" ? (
                            <p className="no-result">{result.msg}</p>
                        ) : result.type === "mult-only" ? (
                            <p className="no-result">請輸入統計期間獲得經驗</p>
                        ) : (
                            <>
                                <RateSg
                                    rate10={result.spot10}
                                    rate60={result.spot60}
                                    clickable={clickable}
                                    onRateClick={onRateClick}
                                />
                                {result.minsToLevelUpSpot > 0 && (
                                    <p className="level-up-hint">
                                        約 <strong>{formatMins(result.minsToLevelUpSpot)}</strong> 升級
                                    </p>
                                )}
                            </>
                        ))}
                </div>

                <div className={`r2-panel${r2Collapsed ? "" : " r2-panel--open"}`}>
                    <div className="r2-content">
                        <button className="r2-close-btn" onClick={() => setR2Collapsed(true)}>
                            ✕
                        </button>
                        <h2 className="rate-result-title">
                            不同倍率回推
                            <Tooltip content="例：用統計期間有氣場無祈禱的經驗，推估無氣場有祈禱時的經驗效率" />
                        </h2>
                        <div className="rate-col-form">
                            <PrayerCheckbox checked={r2Config.hasPrayer} onChange={(v) => setR2Field("hasPrayer", v)} />
                            <PrayerCheckbox
                                checked={r2Config.hasDoubleCard}
                                onChange={(v) => setR2Field("hasDoubleCard", v)}
                                label="加倍卷"
                            />

                            <HottimeField
                                checked={r2Config.hasHottime}
                                onCheckedChange={(v) => setR2Field("hasHottime", v)}
                                multiplier={r2Config.hottimeMult}
                                onMultiplierChange={(v) => setR2Field("hottimeMult", v)}
                            />

                            <div className="field">
                                <label className="prayer-checkbox-row">
                                    <input
                                        type="checkbox"
                                        checked={r2Config.hasAura}
                                        onChange={(e) => setR2Field("hasAura", e.target.checked)}
                                    />
                                    <span>氣場</span>
                                </label>
                            </div>

                            {r2Config.hasAura && (
                                <AuraFields
                                    triggers={r2Config.auraTriggers}
                                    onTriggersChange={(v) => setR2Field("auraTriggers", v)}
                                    duration={r2Config.auraDuration}
                                    onDurationChange={(v) => setR2Field("auraDuration", v)}
                                    multiplier={r2Config.auraMultiplier}
                                    onMultiplierChange={(v) => setR2Field("auraMultiplier", v)}
                                />
                            )}
                        </div>

                        {result && (result.type === "ok" || result.type === "mult-only") && (
                            <div className="rate-col-mult">
                                <span className="effective-mult-label">有效倍率</span>
                                <span className="effective-mult-value">×{result.r2Effective.toFixed(3)}</span>
                            </div>
                        )}

                        {!onlyEffectiveMult && result?.type === "ok" ? (
                            <>
                                <RateSg
                                    rate10={result.r2Rate10}
                                    rate60={result.r2Rate60}
                                    clickable={clickable}
                                    onRateClick={onRateClick}
                                />
                                {result.minsToLevelUpR2 > 0 && (
                                    <p className="level-up-hint">
                                        約 <strong>{formatMins(result.minsToLevelUpR2)}</strong> 升級
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="no-result">請輸入統計期間獲得經驗</p>
                        )}
                    </div>
                    <button className="r2-toggle-btn" onClick={() => setR2Collapsed(false)}>
                        回推計算
                    </button>
                </div>
            </div>
        </CollapsibleCard>
    );
}
