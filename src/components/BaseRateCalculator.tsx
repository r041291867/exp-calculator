import { useMemo, useEffect } from "react";
import { getExpToNext } from "../data/expTable";
import type { SharedLevelExp } from "../hooks/useLevelExp";
import { useTotalExp } from "../hooks/useTotalExp";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { formatMins } from "../utils/format";
import ExpAmountField from "./shared/ExpAmountField";
import AuraFields from "./shared/AuraFields";
import PrayerCheckbox from "./shared/PrayerCheckbox";
import RateResultGrid from "./shared/RateResultGrid";
import CollapsibleCard from "./shared/CollapsibleCard";

export default function BaseRateCalculator({ currentLevel, currentExp, expToNextLevel }: SharedLevelExp) {
    const {
        totalExp,
        setTotalExp,
        totalExpInputMode,
        setTotalExpInputMode,
        totalExpPercentValue,
        handleTotalExpChange,
    } = useTotalExp(expToNextLevel, 100000, "base");

    const [durationMinutes, setDurationMinutes] = useLocalStorage("base.duration", 40);
    const [hasHottime, setHasHottime] = useLocalStorage("base.hottime", false);
    const [hottimeMultiplier, setHottimeMultiplier] = useLocalStorage("base.hottimeMult", 2);
    const [hasAura, setHasAura] = useLocalStorage("base.hasAura", false);
    const [auraTriggers, setAuraTriggers] = useLocalStorage("base.auraTriggers", 0);
    const [auraDuration, setAuraDuration] = useLocalStorage("base.auraDuration", 2);
    const [auraMultiplier, setAuraMultiplier] = useLocalStorage("base.auraMultiplier", 2);
    const [hasPrayer, setHasPrayer] = useLocalStorage("base.prayer", false);

    useEffect(() => {
        setTotalExp(0);
    }, [currentLevel]);

    const result = useMemo(() => {
        if (durationMinutes <= 0 || totalExp <= 0) return null;

        const auraTime = auraDuration * (hasAura ? auraTriggers : 0);
        if (auraTime > durationMinutes) {
            return {
                type: "error" as const,
                msg: `氣場時間（${auraTime} 分）超過統計時間（${durationMinutes} 分）`,
            };
        }

        const hottimeBase = hasHottime ? hottimeMultiplier : 1;
        const auraFraction = auraTime / durationMinutes;
        const effNoPrayer = hottimeBase + (auraMultiplier - 1) * auraFraction;
        const effective = effNoPrayer + (hasPrayer ? 0.25 : 0);

        const base1xPerMin = totalExp / durationMinutes / effective;
        const spotPerMin = base1xPerMin * effNoPrayer;

        const spotNoPrayer10 = Math.round(spotPerMin * 10);
        const spotNoPrayer60 = Math.round(spotPerMin * 60);
        const spotWithPrayer10 = Math.round(spotPerMin * 1.25 * 10);
        const spotWithPrayer60 = Math.round(spotPerMin * 1.25 * 60);

        const noPrayer10 = Math.round(base1xPerMin * 10);
        const noPrayer60 = Math.round(base1xPerMin * 60);
        const withPrayer10 = Math.round(base1xPerMin * 1.25 * 10);
        const withPrayer60 = Math.round(base1xPerMin * 1.25 * 60);

        const remaining = Math.max(0, getExpToNext(currentLevel) - currentExp);
        const minsToLevelUpSpot = remaining > 0 ? Math.ceil(remaining / spotPerMin) : 0;
        const minsToLevelUpBase = remaining > 0 ? Math.ceil(remaining / base1xPerMin) : 0;

        return {
            type: "ok" as const,
            effective,
            spotNoPrayer10,
            spotNoPrayer60,
            spotWithPrayer10,
            spotWithPrayer60,
            noPrayer10,
            noPrayer60,
            withPrayer10,
            withPrayer60,
            minsToLevelUpSpot,
            minsToLevelUpBase,
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
        currentLevel,
        currentExp,
    ]);

    return (
        <CollapsibleCard storageKey="base.collapsed" icon="⚡" title="經驗效率分析">
            <div className="form-body">
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

                <ExpAmountField
                    labelBase="統計期間獲得經驗"
                    currentLevel={currentLevel}
                    value={totalExp}
                    percentValue={totalExpPercentValue}
                    mode={totalExpInputMode}
                    onModeChange={setTotalExpInputMode}
                    onChange={handleTotalExpChange}
                />

                <div className="field-divider">
                    <span>倍率設定</span>
                </div>

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
                    <label className="prayer-checkbox-row" style={{ cursor: "pointer" }}>
                        <input type="checkbox" checked={hasAura} onChange={(e) => setHasAura(e.target.checked)} />
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

            {result?.type === "ok" && (
                <div className="effective-mult-bar">
                    <span className="effective-mult-label">計算有效倍率</span>
                    <span className="effective-mult-value">×{result.effective.toFixed(3)}</span>
                </div>
            )}

            <div className="rate-result-section">
                <h2 className="rate-result-title">場地效率（含 Hottime / 氣場）</h2>
                {!result ? (
                    <p className="no-result">請輸入統計時間和經驗值</p>
                ) : result.type === "error" ? (
                    <p className="no-result">{result.msg}</p>
                ) : (
                    <>
                        <RateResultGrid
                            noPrayer10={result.spotNoPrayer10}
                            noPrayer60={result.spotNoPrayer60}
                            withPrayer10={result.spotWithPrayer10}
                            withPrayer60={result.spotWithPrayer60}
                        />
                        {result.minsToLevelUpSpot > 0 && (
                            <p className="level-up-hint">
                                以目前場地效率約 <strong>{formatMins(result.minsToLevelUpSpot)}</strong> 升級（無祈禱）
                            </p>
                        )}
                    </>
                )}
            </div>

            <div className="rate-result-section">
                <h2 className="rate-result-title">1× 基礎效率（回推）</h2>
                {!result ? (
                    <p className="no-result">請輸入統計時間和經驗值</p>
                ) : result.type === "error" ? null : (
                    <>
                        <RateResultGrid
                            noPrayer10={result.noPrayer10}
                            noPrayer60={result.noPrayer60}
                            withPrayer10={result.withPrayer10}
                            withPrayer60={result.withPrayer60}
                        />
                        {result.minsToLevelUpBase > 0 && (
                            <p className="level-up-hint">
                                以 1× 基礎效率約 <strong>{formatMins(result.minsToLevelUpBase)}</strong> 升級
                            </p>
                        )}
                    </>
                )}
            </div>
        </CollapsibleCard>
    );
}
