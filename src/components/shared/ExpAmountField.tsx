interface Props {
    labelBase: string;
    currentLevel: number;
    value: number;
    percentValue: number;
    mode: "number" | "percent";
    onModeChange: (mode: "number" | "percent") => void;
    onChange: (raw: string) => void;
}

export default function ExpAmountField({
    labelBase, currentLevel,
    value, percentValue,
    mode, onModeChange, onChange,
}: Props) {
    const label =
        mode === "number"
            ? `${labelBase}（數值）`
            : `${labelBase}（% — 以 ${currentLevel} 級升級所需計算）`;

    return (
        <div className="field">
            <div className="field-label-row">
                <label>{label}</label>
                <div
                    className="input-mode-switch"
                    onClick={() => onModeChange(mode === "number" ? "percent" : "number")}
                >
                    <button className={mode === "number" ? "active" : ""}>數值</button>
                    <button className={mode === "percent" ? "active" : ""}>%</button>
                </div>
            </div>
            <input
                type="number"
                min={0}
                step={mode === "percent" ? 0.01 : 1}
                value={mode === "percent" ? (percentValue || "") : (value || "")}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}
