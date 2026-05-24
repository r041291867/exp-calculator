import { EXP_TABLE } from "../../data/expTable";

const LEVEL_OPTIONS = EXP_TABLE.slice(0, 199);
import { formatNumber } from "../../utils/format";

interface Props {
    level: number;
    onLevelChange: (level: number) => void;
    exp: number;
    onExpChange: (raw: string) => void;
    mode: "number" | "percent";
    onModeChange: (mode: "number" | "percent") => void;
    maxExp: number;
    expPercent: number;
}

export default function LevelExpField({
    level,
    onLevelChange,
    exp,
    onExpChange,
    mode,
    onModeChange,
    maxExp,
    expPercent,
}: Props) {
    return (
        <>
            <div className="field">
                <label style={{ height: "23px" }}>目前等級 (1-200)</label>
                <select value={level} onChange={(e) => onLevelChange(Number(e.target.value))}>
                    {LEVEL_OPTIONS.map((entry) => (
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
                        {mode === "number" ? `(0 - ${formatNumber(maxExp)})` : "(0 - 100%)"}
                    </label>
                    <div
                        className="input-mode-switch"
                        onClick={() => onModeChange(mode === "number" ? "percent" : "number")}
                    >
                        <button className={mode === "percent" ? "active" : ""}>%</button>
                        <button className={mode === "number" ? "active" : ""}>數值</button>
                    </div>
                </div>
                <input
                    type="number"
                    min={0}
                    max={mode === "percent" ? 100 : maxExp}
                    step={mode === "percent" ? 0.01 : 1}
                    value={mode === "percent" ? expPercent : exp}
                    onChange={(e) => onExpChange(e.target.value)}
                />
            </div>
        </>
    );
}
