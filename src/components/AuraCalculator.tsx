import { useState, useMemo } from "react";

export default function AuraCalculator() {
    const [totalTime, setTotalTime] = useState(60);
    const [auraTriggers, setAuraTriggers] = useState(5);
    const [auraDuration, setAuraDuration] = useState(2);
    const [auraMultiplier, setAuraMultiplier] = useState(2);
    const [hasPrayer, setHasPrayer] = useState(false);

    const result = useMemo(() => {
        if (totalTime <= 0) return null;

        const auraTime = auraDuration * auraTriggers;
        const nonAuraTime = totalTime - auraTime;

        if (nonAuraTime < 0) {
            return { valid: false as const, auraTime };
        }

        // All multipliers are additive:
        // avg = ((nonAuraTime × 1) + (auraTime × N)) / T
        // prayer adds flat +0.25 on top
        const avgWithoutPrayer = (nonAuraTime * 1 + auraTime * auraMultiplier) / totalTime;
        const effective = avgWithoutPrayer + (hasPrayer ? 0.25 : 0);
        const auraPercent = Math.round((auraTime / totalTime) * 100);

        return {
            valid: true as const,
            effective,
            avgWithoutPrayer,
            auraTime,
            auraPercent,
        };
    }, [totalTime, auraTriggers, auraDuration, auraMultiplier, hasPrayer]);

    return (
        <div className="card">
            <header className="card-header">
                <span className="header-icon">✨</span>
                <h1>氣場效率計算</h1>
            </header>

            <div className="form-body">
                <div className="field">
                    <label>總時間（分鐘）</label>
                    <input
                        type="number"
                        min={1}
                        value={totalTime}
                        onChange={(e) => setTotalTime(Math.max(1, Number(e.target.value)))}
                    />
                </div>

                <div className="field">
                    <label>觸發設定</label>
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

            <div className="rate-result-section">
                <h2 className="rate-result-title">計算結果</h2>

                {!result ? (
                    <p className="no-result">請輸入有效數值</p>
                ) : !result.valid ? (
                    <p className="no-result">
                        氣場時間（{result.auraTime} 分）超過總時間（{totalTime} 分）
                    </p>
                ) : (
                    <div className="aura-result">
                        <div className="aura-multiplier-row">
                            <span className="aura-multiplier-value">
                                ×{result.effective.toFixed(3)}
                            </span>
                            <span className="aura-multiplier-label">有效倍率</span>
                        </div>
                        <div className="aura-breakdown">
                            <div className="aura-breakdown-row">
                                <span>氣場時間</span>
                                <span>
                                    {result.auraTime} / {totalTime} 分（{result.auraPercent}%）
                                </span>
                            </div>
                            <div className="aura-breakdown-row">
                                <span>氣場平均</span>
                                <span>×{result.avgWithoutPrayer.toFixed(3)}</span>
                            </div>
                            {hasPrayer && (
                                <div className="aura-breakdown-row">
                                    <span>祈禱加成</span>
                                    <span>+0.25</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
