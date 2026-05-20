interface Props {
    triggers: number;
    onTriggersChange: (v: number) => void;
    duration: number;
    onDurationChange: (v: number) => void;
    multiplier: number;
    onMultiplierChange: (v: number) => void;
}

export default function AuraFields({
    triggers, onTriggersChange,
    duration, onDurationChange,
    multiplier, onMultiplierChange,
}: Props) {
    return (
        <div className="field">
            <div className="aura-fields-row">
                <div className="interval-col">
                    <span className="sub-label">觸發次數</span>
                    <input
                        type="number"
                        min={0}
                        value={triggers || ""}
                        onChange={(e) => onTriggersChange(Number(e.target.value))}
                        onBlur={() => onTriggersChange(Math.max(0, triggers || 0))}
                    />
                </div>
                <div className="interval-col">
                    <span className="sub-label">時間（分/次）</span>
                    <input
                        type="number"
                        min={0.5}
                        step={0.5}
                        value={duration || ""}
                        onChange={(e) => onDurationChange(Number(e.target.value))}
                        onBlur={() => onDurationChange(Math.max(0.5, duration || 0.5))}
                    />
                </div>
                <div className="interval-col">
                    <span className="sub-label">倍數</span>
                    <div className="daily-hours-row">
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
                </div>
            </div>
        </div>
    );
}
