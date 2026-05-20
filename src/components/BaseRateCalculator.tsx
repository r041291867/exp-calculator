import { useState, useMemo } from "react";
import { getExpToNext } from "../data/expTable";
import { useLevelExp } from "../hooks/useLevelExp";
import { useTotalExp } from "../hooks/useTotalExp";
import { formatMins } from "../utils/format";
import LevelExpField from "./shared/LevelExpField";
import ExpAmountField from "./shared/ExpAmountField";
import AuraFields from "./shared/AuraFields";
import PrayerCheckbox from "./shared/PrayerCheckbox";
import RateResultGrid from "./shared/RateResultGrid";

export default function BaseRateCalculator() {
    const {
        currentLevel, currentExp, expInputMode,
        expToNextLevel, maxCurrentExp, expPercentValue,
        setCurrentLevel, setCurrentExp, setExpInputMode,
        handleExpChange,
    } = useLevelExp();

    const {
        totalExp, setTotalExp,
        totalExpInputMode, setTotalExpInputMode,
        totalExpPercentValue,
        handleTotalExpChange,
    } = useTotalExp(expToNextLevel);

    const [durationMinutes, setDurationMinutes] = useState(40);
    const [hasHottime, setHasHottime] = useState(false);
    const [hottimeMultiplier, setHottimeMultiplier] = useState(2);
    const [auraTriggers, setAuraTriggers] = useState(0);
    const [auraDuration, setAuraDuration] = useState(2);
    const [auraMultiplier, setAuraMultiplier] = useState(2);
    const [hasPrayer, setHasPrayer] = useState(false);

    const handleLevelChange = (level: number) => {
        setCurrentLevel(level);
        setCurrentExp(0);
        setTotalExp(0);
    };

    const result = useMemo(() => {
        if (durationMinutes <= 0 || totalExp <= 0) return null;

        const auraTime = auraDuration * auraTriggers;
        if (auraTime > durationMinutes) {
            return {
                type: "error" as const,
                msg: `氣場時間（${auraTime} 分）超過統計時間（${durationMinutes} 分）`,
            };
        }

        const hottimeBase = hasHottime ? hottimeMultiplier : 1;
        const auraFraction = auraTime / durationMinutes;
        const effective = hottimeBase + (auraMultiplier - 1) * auraFraction + (hasPrayer ? 0.25 : 0);

        const base1xPerMin = totalExp / durationMinutes / effective;

        const noPrayer10 = Math.round(base1xPerMin * 10);
        const noPrayer60 = Math.round(base1xPerMin * 60);
        const withPrayer10 = Math.round(base1xPerMin * 1.25 * 10);
        const withPrayer60 = Math.round(base1xPerMin * 1.25 * 60);

        const remaining = Math.max(0, getExpToNext(currentLevel) - currentExp);
        const minsToLevelUp = remaining > 0 ? Math.ceil(remaining / base1xPerMin) : 0;

        return { type: "ok" as const, effective, noPrayer10, noPrayer60, withPrayer10, withPrayer60, minsToLevelUp };
    }, [
        durationMinutes, totalExp,
        hasHottime, hottimeMultiplier,
        auraTriggers, auraDuration, auraMultiplier,
        hasPrayer, currentLevel, currentExp,
    ]);

    return (
        <div className="card">
            <header className="card-header">
                <span className="header-icon">🔍</span>
                <h1>基礎經驗回推</h1>
            </header>

            <div className="form-body">
                <LevelExpField
                    level={currentLevel}
                    onLevelChange={handleLevelChange}
                    exp={currentExp}
                    onExpChange={handleExpChange}
                    mode={expInputMode}
                    onModeChange={setExpInputMode}
                    maxExp={maxCurrentExp}
                    expPercent={expPercentValue}
                />

                <div className="field">
                    <label>統計時間（分鐘）</label>
                    <input
                        type="number"
                        min={1}
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Math.max(1, Number(e.target.value)))}
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

                <div className="field-divider"><span>當時倍率設定</span></div>

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
                                    value={hottimeMultiplier}
                                    onChange={(e) =>
                                        setHottimeMultiplier(Math.max(1, Number(e.target.value)))
                                    }
                                />
                                <span className="unit-label">倍</span>
                            </div>
                        )}
                    </div>
                </div>

                <AuraFields
                    triggers={auraTriggers}
                    onTriggersChange={setAuraTriggers}
                    duration={auraDuration}
                    onDurationChange={setAuraDuration}
                    multiplier={auraMultiplier}
                    onMultiplierChange={setAuraMultiplier}
                />

                <PrayerCheckbox checked={hasPrayer} onChange={setHasPrayer} />
            </div>

            {result?.type === "ok" && (
                <div className="effective-mult-bar">
                    <span className="effective-mult-label">計算有效倍率</span>
                    <span className="effective-mult-value">×{result.effective.toFixed(3)}</span>
                </div>
            )}

            <div className="rate-result-section">
                <h2 className="rate-result-title">1× 基礎經驗（回推）</h2>

                {!result ? (
                    <p className="no-result">請輸入統計時間和經驗值</p>
                ) : result.type === "error" ? (
                    <p className="no-result">{result.msg}</p>
                ) : (
                    <>
                        <RateResultGrid
                            noPrayer10={result.noPrayer10}
                            noPrayer60={result.noPrayer60}
                            withPrayer10={result.withPrayer10}
                            withPrayer60={result.withPrayer60}
                        />
                        {result.minsToLevelUp > 0 && (
                            <p className="level-up-hint">
                                以 1× 基礎效率約{" "}
                                <strong>{formatMins(result.minsToLevelUp)}</strong> 升級
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
