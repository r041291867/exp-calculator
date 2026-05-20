import { useMemo, useEffect } from "react";
import { getExpToNext } from "../data/expTable";
import type { SharedLevelExp } from "../hooks/useLevelExp";
import { useTotalExp } from "../hooks/useTotalExp";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { formatMins } from "../utils/format";
import ExpAmountField from "./shared/ExpAmountField";
import PrayerCheckbox from "./shared/PrayerCheckbox";
import RateResultGrid from "./shared/RateResultGrid";
import CollapsibleCard from "./shared/CollapsibleCard";

const PRAYER_MULT = 1.25;

export default function ExpRateCalculator({ currentLevel, currentExp, expToNextLevel }: SharedLevelExp) {
    const {
        totalExp,
        setTotalExp,
        totalExpInputMode,
        setTotalExpInputMode,
        totalExpPercentValue,
        handleTotalExpChange,
    } = useTotalExp(expToNextLevel, 100000, "rate");

    const [durationMinutes, setDurationMinutes] = useLocalStorage("rate.duration", 40);
    const [hasPrayer, setHasPrayer] = useLocalStorage("rate.prayer", false);

    useEffect(() => {
        setTotalExp(0);
    }, [currentLevel]);

    const result = useMemo(() => {
        if (durationMinutes <= 0 || totalExp <= 0) return null;

        const basePerMin = hasPrayer ? totalExp / PRAYER_MULT / durationMinutes : totalExp / durationMinutes;

        const noPrayer10 = Math.round(basePerMin * 10);
        const noPrayer60 = Math.round(basePerMin * 60);
        const withPrayer10 = Math.round(basePerMin * PRAYER_MULT * 10);
        const withPrayer60 = Math.round(basePerMin * PRAYER_MULT * 60);

        const remaining = Math.max(0, getExpToNext(currentLevel) - currentExp);
        const minsToLevelUp = remaining > 0 ? Math.ceil(remaining / basePerMin) : 0;

        return { noPrayer10, noPrayer60, withPrayer10, withPrayer60, minsToLevelUp };
    }, [durationMinutes, totalExp, hasPrayer, currentLevel, currentExp]);

    return (
        <CollapsibleCard storageKey="rate.collapsed" icon="⚡" title="經驗效率計算">
            <div className="form-body">
                <div className="field">
                    <label>時間段（分鐘）</label>
                    <input
                        type="number"
                        min={1}
                        value={durationMinutes || ""}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        onBlur={() => setDurationMinutes((v) => Math.max(1, v || 1))}
                    />
                </div>

                <ExpAmountField
                    labelBase="獲得經驗值"
                    currentLevel={currentLevel}
                    value={totalExp}
                    percentValue={totalExpPercentValue}
                    mode={totalExpInputMode}
                    onModeChange={setTotalExpInputMode}
                    onChange={handleTotalExpChange}
                />

                <PrayerCheckbox checked={hasPrayer} onChange={setHasPrayer} label="測量期間有使用祈禱（經驗 ×1.25）" />
            </div>

            <div className="rate-result-section">
                <h2 className="rate-result-title">計算結果</h2>
                {result ? (
                    <>
                        <RateResultGrid
                            noPrayer10={result.noPrayer10}
                            noPrayer60={result.noPrayer60}
                            withPrayer10={result.withPrayer10}
                            withPrayer60={result.withPrayer60}
                        />
                        {result.minsToLevelUp > 0 && (
                            <p className="level-up-hint">
                                以目前效率約 <strong>{formatMins(result.minsToLevelUp)}</strong> 升級（無祈禱）
                            </p>
                        )}
                    </>
                ) : (
                    <p className="no-result">請輸入時間段和經驗值</p>
                )}
            </div>
        </CollapsibleCard>
    );
}
