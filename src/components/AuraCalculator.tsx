import { useMemo } from "react";
import AuraFields from "./shared/AuraFields";
import PrayerCheckbox from "./shared/PrayerCheckbox";
import CollapsibleCard from "./shared/CollapsibleCard";
import { useLocalStorage } from "../hooks/useLocalStorage";

export default function AuraCalculator() {
    const [totalTime, setTotalTime] = useLocalStorage("aura.totalTime", 60);
    const [auraTriggers, setAuraTriggers] = useLocalStorage("aura.triggers", 15);
    const [auraDuration, setAuraDuration] = useLocalStorage("aura.duration", 2);
    const [auraMultiplier, setAuraMultiplier] = useLocalStorage("aura.multiplier", 2);
    const [hasPrayer, setHasPrayer] = useLocalStorage("aura.prayer", false);

    const result = useMemo(() => {
        if (totalTime <= 0) return null;

        const auraTime = auraDuration * auraTriggers;
        const nonAuraTime = totalTime - auraTime;

        if (nonAuraTime < 0) {
            return { valid: false as const, auraTime };
        }

        const avgWithoutPrayer = (nonAuraTime * 1 + auraTime * auraMultiplier) / totalTime;
        const effective = avgWithoutPrayer + (hasPrayer ? 0.25 : 0);
        const auraPercent = Math.round((auraTime / totalTime) * 100);

        return { valid: true as const, effective, avgWithoutPrayer, auraTime, auraPercent };
    }, [totalTime, auraTriggers, auraDuration, auraMultiplier, hasPrayer]);

    return (
        <CollapsibleCard storageKey="aura.collapsed" icon="✨" title="氣場等效倍率計算">
            <div className="form-body">
                <div className="field">
                    <label>總時間（分鐘）</label>
                    <input
                        type="number"
                        min={1}
                        value={totalTime || ""}
                        onChange={(e) => setTotalTime(Number(e.target.value))}
                        onBlur={() => setTotalTime((v) => Math.max(1, v || 1))}
                    />
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
                            <span className="aura-multiplier-value">×{result.effective.toFixed(3)}</span>
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
        </CollapsibleCard>
    );
}
