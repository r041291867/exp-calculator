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
        <>
            <div className="field">
                <label>氣場設定</label>
                <div className="interval-row">
                    <div className="interval-col">
                        <span className="sub-label">觸發次數</span>
                        <input
                            type="number"
                            min={0}
                            value={triggers}
                            onChange={(e) => onTriggersChange(Math.max(0, Number(e.target.value)))}
                        />
                    </div>
                    <div className="interval-col">
                        <span className="sub-label">氣場時間（分/次）</span>
                        <input
                            type="number"
                            min={0.5}
                            step={0.5}
                            value={duration}
                            onChange={(e) => onDurationChange(Math.max(0.5, Number(e.target.value)))}
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
                        value={multiplier}
                        onChange={(e) => onMultiplierChange(Math.max(1, Number(e.target.value)))}
                    />
                    <span className="unit-label">倍</span>
                </div>
            </div>
        </>
    );
}
