import { useMemo, useEffect } from "react";
import { getExpToNext } from "../data/expTable";
import type { SharedLevelExp } from "../hooks/useLevelExp";
import { useTotalExp } from "../hooks/useTotalExp";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { formatNumber, formatMins } from "../utils/format";
import ExpAmountField from "./shared/ExpAmountField";
import AuraFields from "./shared/AuraFields";
import PrayerCheckbox from "./shared/PrayerCheckbox";
import CollapsibleCard from "./shared/CollapsibleCard";

interface BaseRateProps extends SharedLevelExp {
    onRateClick?: (mins: number, exp: number) => void;
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
    const [hasHottime, setHasHottime] = useLocalStorage("base.hottime", false);
    const [hottimeMultiplier, setHottimeMultiplier] = useLocalStorage("base.hottimeMult", 2);
    const [hasAura, setHasAura] = useLocalStorage("base.hasAura", false);
    const [auraTriggers, setAuraTriggers] = useLocalStorage("base.auraTriggers", 15);
    const [auraDuration, setAuraDuration] = useLocalStorage("base.auraDuration", 2);
    const [auraMultiplier, setAuraMultiplier] = useLocalStorage("base.auraMultiplier", 2);
    const [hasPrayer, setHasPrayer] = useLocalStorage("base.prayer", false);
    const [onlyEffectiveMult, setOnlyEffectiveMult] = useLocalStorage("base.onlyEffMult", false);

    const [r2Collapsed, setR2Collapsed] = useLocalStorage("base.r2.collapsed", true);
    const [r2HasPrayer, setR2HasPrayer] = useLocalStorage("base.r2.prayer", false);
    const [r2HasHottime, setR2HasHottime] = useLocalStorage("base.r2.hottime", false);
    const [r2HottimeMult, setR2HottimeMult] = useLocalStorage("base.r2.hottimeMult", 2);
    const [r2HasAura, setR2HasAura] = useLocalStorage("base.r2.hasAura", false);
    const [r2AuraTriggers, setR2AuraTriggers] = useLocalStorage("base.r2.auraTriggers", 15);
    const [r2AuraDuration, setR2AuraDuration] = useLocalStorage("base.r2.auraDuration", 2);
    const [r2AuraMult, setR2AuraMult] = useLocalStorage("base.r2.auraMult", 2);

    useEffect(() => {
        setTotalExp(0);
    }, [currentLevel]);

    const result = useMemo(() => {
        if (durationMinutes <= 0) return null;

        const auraTime = auraDuration * (hasAura ? auraTriggers : 0);
        if (auraTime > durationMinutes) {
            return { type: "error" as const, msg: `氣場時間（${auraTime} 分）超過統計時間（${durationMinutes} 分）` };
        }

        const hottimeBase = hasHottime ? hottimeMultiplier : 1;
        const auraFraction = auraTime / durationMinutes;
        const effNoPrayer = hottimeBase + (auraMultiplier - 1) * auraFraction;
        const effective = effNoPrayer + (hasPrayer ? 0.25 : 0);

        const r2AuraTime = r2AuraDuration * (r2HasAura ? r2AuraTriggers : 0);
        const r2AuraFraction = Math.min(1, r2AuraTime / durationMinutes);
        const r2HottimeBase = r2HasHottime ? r2HottimeMult : 1;
        const r2EffNoPrayer = r2HottimeBase + (r2AuraMult - 1) * r2AuraFraction;
        const r2Effective = r2EffNoPrayer + (r2HasPrayer ? 0.25 : 0);

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
        r2HasPrayer,
        r2HasHottime,
        r2HottimeMult,
        r2HasAura,
        r2AuraTriggers,
        r2AuraDuration,
        r2AuraMult,
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
                    <h2 className="rate-result-title">量測倍率設定</h2>

                    <div className="rate-col-form">
                        <PrayerCheckbox checked={hasPrayer} onChange={setHasPrayer} />

                        <div className="field">
                            <div className="buff-row">
                                <label className="prayer-checkbox-row">
                                    <input
                                        type="checkbox"
                                        checked={hasHottime}
                                        onChange={(e) => setHasHottime(e.target.checked)}
                                    />
                                    <span>Hot Time</span>
                                </label>
                                {hasHottime && (
                                    <div className="buff-inline-input">
                                        <input
                                            type="number"
                                            min={1}
                                            step={0.25}
                                            value={hottimeMultiplier || ""}
                                            onChange={(e) => setHottimeMultiplier(Number(e.target.value))}
                                            onBlur={() => setHottimeMultiplier((v) => Math.max(1, v || 1))}
                                        />
                                        <span className="unit-label">倍</span>
                                    </div>
                                )}
                            </div>
                        </div>

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

                    {/* <div className="field-divider"><span>場地效率</span></div> */}

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
                                <div className="rate-sg">
                                    <div className="rate-grid-label">10 分鐘</div>
                                    <div
                                        className={`rate-grid-value${clickable ? " rate-sg-clickable" : ""}`}
                                        onClick={clickable ? () => onRateClick(10, result.spot10) : undefined}
                                    >
                                        {formatNumber(result.spot10)}
                                    </div>
                                    <div className="rate-grid-label">60 分鐘</div>
                                    <div
                                        className={`rate-grid-value${clickable ? " rate-sg-clickable" : ""}`}
                                        onClick={clickable ? () => onRateClick(60, result.spot60) : undefined}
                                    >
                                        {formatNumber(result.spot60)}
                                    </div>
                                </div>
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
                        <button className="r2-close-btn" onClick={() => setR2Collapsed(true)}>✕</button>
                        <h2 className="rate-result-title">回推計算</h2>

                        <div className="rate-col-form">
                            <PrayerCheckbox checked={r2HasPrayer} onChange={setR2HasPrayer} />

                            <div className="field">
                                <div className="buff-row">
                                    <label className="prayer-checkbox-row">
                                        <input
                                            type="checkbox"
                                            checked={r2HasHottime}
                                            onChange={(e) => setR2HasHottime(e.target.checked)}
                                        />
                                        <span>Hot Time</span>
                                    </label>
                                    {r2HasHottime && (
                                        <div className="buff-inline-input">
                                            <input
                                                type="number"
                                                min={1}
                                                step={0.25}
                                                value={r2HottimeMult || ""}
                                                onChange={(e) => setR2HottimeMult(Number(e.target.value))}
                                                onBlur={() => setR2HottimeMult((v) => Math.max(1, v || 1))}
                                            />
                                            <span className="unit-label">倍</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="field">
                                <label className="prayer-checkbox-row">
                                    <input
                                        type="checkbox"
                                        checked={r2HasAura}
                                        onChange={(e) => setR2HasAura(e.target.checked)}
                                    />
                                    <span>氣場</span>
                                </label>
                            </div>

                            {r2HasAura && (
                                <AuraFields
                                    triggers={r2AuraTriggers}
                                    onTriggersChange={setR2AuraTriggers}
                                    duration={r2AuraDuration}
                                    onDurationChange={setR2AuraDuration}
                                    multiplier={r2AuraMult}
                                    onMultiplierChange={setR2AuraMult}
                                />
                            )}
                        </div>

                        {result && (result.type === "ok" || result.type === "mult-only") && (
                            <div className="rate-col-mult">
                                <span className="effective-mult-label">有效倍率</span>
                                <span className="effective-mult-value">×{result.r2Effective.toFixed(3)}</span>
                            </div>
                        )}

                        {!onlyEffectiveMult && result?.type === "ok" && (
                            <>
                                <div className="rate-sg">
                                    <div className="rate-grid-label">10 分鐘</div>
                                    <div
                                        className={`rate-grid-value${clickable ? " rate-sg-clickable" : ""}`}
                                        onClick={clickable ? () => onRateClick(10, result.r2Rate10) : undefined}
                                    >
                                        {formatNumber(result.r2Rate10)}
                                    </div>
                                    <div className="rate-grid-label">60 分鐘</div>
                                    <div
                                        className={`rate-grid-value${clickable ? " rate-sg-clickable" : ""}`}
                                        onClick={clickable ? () => onRateClick(60, result.r2Rate60) : undefined}
                                    >
                                        {formatNumber(result.r2Rate60)}
                                    </div>
                                </div>
                                {result.minsToLevelUpR2 > 0 && (
                                    <p className="level-up-hint">
                                        約 <strong>{formatMins(result.minsToLevelUpR2)}</strong> 升級
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                    <button
                        className="r2-toggle-btn"
                        onClick={() => setR2Collapsed(false)}
                    >
                        回推計算
                    </button>
                </div>
            </div>
        </CollapsibleCard>
    );
}
