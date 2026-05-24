import { useMemo, useEffect } from "react";
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

interface R2Config {
    hasDoubleCard: boolean;
    hasPrayer: boolean;
    hasHottime: boolean;
    hottimeMult: number;
    hasAura: boolean;
    auraTriggers: number;
    auraDuration: number;
    auraMult: number;
}

const R2_DEFAULTS: R2Config = {
    hasDoubleCard: false,
    hasPrayer: false,
    hasHottime: false,
    hottimeMult: 2,
    hasAura: false,
    auraTriggers: 15,
    auraDuration: 2,
    auraMult: 2,
};

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
    const [hasHottime, setHasHottime] = useLocalStorage("base.hottime", false);
    const [hottimeMultiplier, setHottimeMultiplier] = useLocalStorage("base.hottimeMult", 2);
    const [hasAura, setHasAura] = useLocalStorage("base.hasAura", false);
    const [auraTriggers, setAuraTriggers] = useLocalStorage("base.auraTriggers", 15);
    const [auraDuration, setAuraDuration] = useLocalStorage("base.auraDuration", 2);
    const [auraMultiplier, setAuraMultiplier] = useLocalStorage("base.auraMultiplier", 2);
    const [hasPrayer, setHasPrayer] = useLocalStorage("base.prayer", false);
    const [hasDoubleCard, setHasDoubleCard] = useLocalStorage("base.doubleCard", false);
    const [onlyEffectiveMult, setOnlyEffectiveMult] = useLocalStorage("base.onlyEffMult", false);

    const [r2Collapsed, setR2Collapsed] = useLocalStorage("base.r2.collapsed", true);
    const [r2Config, setR2Config] = useLocalStorage<R2Config>("base.r2.config", R2_DEFAULTS);

    const setR2 = <K extends keyof R2Config>(key: K, value: R2Config[K]) =>
        setR2Config((prev) => ({ ...prev, [key]: value }));

    useEffect(() => {
        setTotalExp(0);
    }, [currentLevel]);

    const result = useMemo(() => {
        if (durationMinutes <= 0) return null;

        const auraTime = calcAuraTime(hasAura, auraTriggers, auraDuration);
        if (auraTime > durationMinutes) {
            return { type: "error" as const, msg: `氣場時間（${auraTime} 分）超過統計時間（${durationMinutes} 分）` };
        }

        const effective = calcEffective({
            hasHottime,
            hottimeMult: hottimeMultiplier,
            hasAura,
            auraTriggers,
            auraDuration,
            auraMultiplier,
            durationMinutes,
            hasPrayer,
            hasDoubleCard,
        });

        const r2Effective = calcEffective({
            hasHottime: r2Config.hasHottime,
            hottimeMult: r2Config.hottimeMult,
            hasAura: r2Config.hasAura,
            auraTriggers: r2Config.auraTriggers,
            auraDuration: r2Config.auraDuration,
            auraMultiplier: r2Config.auraMult,
            durationMinutes,
            hasPrayer: r2Config.hasPrayer,
            hasDoubleCard: r2Config.hasDoubleCard,
        });

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
    }, [
        durationMinutes,
        totalExp,
        hasHottime,
        hottimeMultiplier,
        hasAura,
        auraTriggers,
        auraDuration,
        auraMultiplier,
        hasPrayer,
        hasDoubleCard,
        r2Config,
        onlyEffectiveMult,
        currentLevel,
        currentExp,
    ]);

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
                        <PrayerCheckbox checked={hasPrayer} onChange={setHasPrayer} />
                        <PrayerCheckbox checked={hasDoubleCard} onChange={setHasDoubleCard} label="加倍卷" />

                        <HottimeField
                            checked={hasHottime}
                            onCheckedChange={setHasHottime}
                            multiplier={hottimeMultiplier}
                            onMultiplierChange={setHottimeMultiplier}
                        />

                        <div className="field">
                            <label className="prayer-checkbox-row">
                                <input
                                    type="checkbox"
                                    checked={hasAura}
                                    onChange={(e) => setHasAura(e.target.checked)}
                                />
                                <span>氣場</span>
                            </label>
                        </div>

                        {hasAura && (
                            <AuraFields
                                triggers={auraTriggers}
                                onTriggersChange={setAuraTriggers}
                                duration={auraDuration}
                                onDurationChange={setAuraDuration}
                                multiplier={auraMultiplier}
                                onMultiplierChange={setAuraMultiplier}
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
                            <PrayerCheckbox checked={r2Config.hasPrayer} onChange={(v) => setR2("hasPrayer", v)} />
                            <PrayerCheckbox
                                checked={r2Config.hasDoubleCard}
                                onChange={(v) => setR2("hasDoubleCard", v)}
                                label="加倍卷"
                            />

                            <HottimeField
                                checked={r2Config.hasHottime}
                                onCheckedChange={(v) => setR2("hasHottime", v)}
                                multiplier={r2Config.hottimeMult}
                                onMultiplierChange={(v) => setR2("hottimeMult", v)}
                            />

                            <div className="field">
                                <label className="prayer-checkbox-row">
                                    <input
                                        type="checkbox"
                                        checked={r2Config.hasAura}
                                        onChange={(e) => setR2("hasAura", e.target.checked)}
                                    />
                                    <span>氣場</span>
                                </label>
                            </div>

                            {r2Config.hasAura && (
                                <AuraFields
                                    triggers={r2Config.auraTriggers}
                                    onTriggersChange={(v) => setR2("auraTriggers", v)}
                                    duration={r2Config.auraDuration}
                                    onDurationChange={(v) => setR2("auraDuration", v)}
                                    multiplier={r2Config.auraMult}
                                    onMultiplierChange={(v) => setR2("auraMult", v)}
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
