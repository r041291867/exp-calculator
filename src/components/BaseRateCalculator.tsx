import { useState, useMemo } from "react";
import { EXP_TABLE, getExpToNext } from "../data/expTable";

function formatNumber(n: number): string {
    return n.toLocaleString("zh-TW");
}

function formatMins(mins: number): string {
    if (mins <= 0) return "已達標";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} 分鐘`;
    if (m === 0) return `${h} 小時`;
    return `${h} 小時 ${m} 分鐘`;
}

export default function BaseRateCalculator() {
    const [currentLevel, setCurrentLevel] = useState(1);
    const [currentExp, setCurrentExp] = useState(0);
    const [expInputMode, setExpInputMode] = useState<"number" | "percent">("number");

    const [durationMinutes, setDurationMinutes] = useState(40);
    const [totalExp, setTotalExp] = useState(100000);
    const [totalExpInputMode, setTotalExpInputMode] = useState<"number" | "percent">("number");

    const [hasHottime, setHasHottime] = useState(false);
    const [hottimeMultiplier, setHottimeMultiplier] = useState(2);
    const [auraTriggers, setAuraTriggers] = useState(0);
    const [auraDuration, setAuraDuration] = useState(2);
    const [auraMultiplier, setAuraMultiplier] = useState(2);
    const [hasPrayer, setHasPrayer] = useState(false);

    const expToNextLevel = useMemo(() => getExpToNext(currentLevel), [currentLevel]);
    const maxCurrentExp = useMemo(() => expToNextLevel - 1, [expToNextLevel]);

    const expPercentValue = useMemo(() => {
        if (maxCurrentExp <= 0) return 0;
        return Math.round((currentExp / maxCurrentExp) * 1000) / 10;
    }, [currentExp, maxCurrentExp]);

    const totalExpPercentValue = useMemo(() => {
        if (expToNextLevel <= 0) return 0;
        return Math.round((totalExp / expToNextLevel) * 1000) / 10;
    }, [totalExp, expToNextLevel]);

    const handleCurrentLevelChange = (level: number) => {
        setCurrentLevel(level);
        setCurrentExp(0);
        setTotalExp(0);
    };

    const handleCurrentExpChange = (raw: string) => {
        if (expInputMode === "percent") {
            const pct = Math.min(100, Math.max(0, Number(raw)));
            setCurrentExp(Math.round((pct / 100) * maxCurrentExp));
        } else {
            setCurrentExp(Math.min(Math.max(0, Number(raw)), maxCurrentExp));
        }
    };

    const handleTotalExpChange = (raw: string) => {
        if (totalExpInputMode === "percent") {
            setTotalExp(Math.round(Math.max(0, Number(raw)) / 100 * expToNextLevel));
        } else {
            setTotalExp(Math.max(0, Number(raw)));
        }
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

        // All multipliers additive:
        // effective = hottimeBase + (auraMultiplier-1) × auraFraction + prayerBonus
        // where hottimeBase = 1 (no hottime) or N (hottime active)
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

        return {
            type: "ok" as const,
            effective,
            noPrayer10, noPrayer60, withPrayer10, withPrayer60,
            minsToLevelUp,
        };
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
                {/* ── Level / exp ── */}
                <div className="field">
                    <label>目前等級 (1-200)</label>
                    <select
                        value={currentLevel}
                        onChange={(e) => handleCurrentLevelChange(Number(e.target.value))}
                    >
                        {EXP_TABLE.slice(0, 199).map((entry) => (
                            <option key={entry.level} value={entry.level}>
                                {entry.level} 級
                            </option>
                        ))}
                    </select>
                </div>

                <div className="field">
                    <div className="field-label-row">
                        <label>
                            目前經驗值&nbsp;
                            {expInputMode === "number"
                                ? `(0 - ${formatNumber(maxCurrentExp)})`
                                : "(0 - 100%)"}
                        </label>
                        <div className="input-mode-switch">
                            <button
                                className={expInputMode === "number" ? "active" : ""}
                                onClick={() => setExpInputMode("number")}
                            >
                                數值
                            </button>
                            <button
                                className={expInputMode === "percent" ? "active" : ""}
                                onClick={() => setExpInputMode("percent")}
                            >
                                %
                            </button>
                        </div>
                    </div>
                    <input
                        type="number"
                        min={0}
                        max={expInputMode === "percent" ? 100 : maxCurrentExp}
                        step={expInputMode === "percent" ? 0.1 : 1}
                        value={expInputMode === "percent" ? expPercentValue : currentExp}
                        onChange={(e) => handleCurrentExpChange(e.target.value)}
                    />
                </div>

                {/* ── Measurement ── */}
                <div className="field">
                    <label>統計時間（分鐘）</label>
                    <input
                        type="number"
                        min={1}
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Math.max(1, Number(e.target.value)))}
                    />
                </div>

                <div className="field">
                    <div className="field-label-row">
                        <label>
                            統計期間獲得經驗&nbsp;
                            {totalExpInputMode === "number"
                                ? "(數值)"
                                : `(% — 以 ${currentLevel} 級升級所需計算)`}
                        </label>
                        <div className="input-mode-switch">
                            <button
                                className={totalExpInputMode === "number" ? "active" : ""}
                                onClick={() => setTotalExpInputMode("number")}
                            >
                                數值
                            </button>
                            <button
                                className={totalExpInputMode === "percent" ? "active" : ""}
                                onClick={() => setTotalExpInputMode("percent")}
                            >
                                %
                            </button>
                        </div>
                    </div>
                    <input
                        type="number"
                        min={0}
                        step={totalExpInputMode === "percent" ? 0.1 : 1}
                        value={totalExpInputMode === "percent" ? totalExpPercentValue : totalExp}
                        onChange={(e) => handleTotalExpChange(e.target.value)}
                    />
                </div>

                {/* ── Buff settings ── */}
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

                <div className="field">
                    <label>氣場設定</label>
                    <div className="interval-row">
                        <div className="interval-col">
                            <span className="sub-label">觸發次數</span>
                            <input
                                type="number"
                                min={0}
                                value={auraTriggers}
                                onChange={(e) =>
                                    setAuraTriggers(Math.max(0, Number(e.target.value)))
                                }
                            />
                        </div>
                        <div className="interval-col">
                            <span className="sub-label">氣場時間（分/次）</span>
                            <input
                                type="number"
                                min={0.5}
                                step={0.5}
                                value={auraDuration}
                                onChange={(e) =>
                                    setAuraDuration(Math.max(0.5, Number(e.target.value)))
                                }
                            />
                        </div>
                    </div>
                </div>

                <div className="field">
                    <label>氣場倍數</label>
                    <div className="daily-hours-row">
                        <input
                            type="number"
                            min={1}
                            step={0.25}
                            value={auraMultiplier}
                            onChange={(e) =>
                                setAuraMultiplier(Math.max(1, Number(e.target.value)))
                            }
                        />
                        <span className="unit-label">倍</span>
                    </div>
                </div>

                <div className="field">
                    <label className="prayer-checkbox-row">
                        <input
                            type="checkbox"
                            checked={hasPrayer}
                            onChange={(e) => setHasPrayer(e.target.checked)}
                        />
                        <span>有祈禱（+0.25 倍）</span>
                    </label>
                </div>
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
                        <div className="rate-result-grid">
                            <div className="rate-grid-cell rate-grid-header" />
                            <div className="rate-grid-cell rate-grid-header">無祈禱</div>
                            <div className="rate-grid-cell rate-grid-header prayer-col">有祈禱</div>

                            <div className="rate-grid-cell rate-grid-label">10 分鐘</div>
                            <div className="rate-grid-cell rate-grid-value">
                                {formatNumber(result.noPrayer10)}
                            </div>
                            <div className="rate-grid-cell rate-grid-value prayer-col">
                                {formatNumber(result.withPrayer10)}
                            </div>

                            <div className="rate-grid-cell rate-grid-label">60 分鐘</div>
                            <div className="rate-grid-cell rate-grid-value">
                                {formatNumber(result.noPrayer60)}
                            </div>
                            <div className="rate-grid-cell rate-grid-value prayer-col">
                                {formatNumber(result.withPrayer60)}
                            </div>
                        </div>
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
