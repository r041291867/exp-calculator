import { useState, useMemo } from "react";
import { EXP_TABLE, getExpToNext } from "../data/expTable";

const PRAYER_MULT = 1.25;

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

export default function ExpRateCalculator() {
    const [currentLevel, setCurrentLevel] = useState(1);
    const [currentExp, setCurrentExp] = useState(0);
    const [expInputMode, setExpInputMode] = useState<"number" | "percent">("number");
    const [durationMinutes, setDurationMinutes] = useState(40);
    const [totalExp, setTotalExp] = useState(100000);
    const [totalExpInputMode, setTotalExpInputMode] = useState<"number" | "percent">("number");
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

    const handleExpChange = (raw: string) => {
        if (expInputMode === "percent") {
            const pct = Math.min(100, Math.max(0, Number(raw)));
            setCurrentExp(Math.round((pct / 100) * maxCurrentExp));
        } else {
            setCurrentExp(Math.min(Math.max(0, Number(raw)), maxCurrentExp));
        }
    };

    const handleTotalExpChange = (raw: string) => {
        if (totalExpInputMode === "percent") {
            const pct = Math.max(0, Number(raw));
            setTotalExp(Math.round((pct / 100) * expToNextLevel));
        } else {
            setTotalExp(Math.max(0, Number(raw)));
        }
    };

    const result = useMemo(() => {
        if (durationMinutes <= 0 || totalExp <= 0) return null;

        // Derive the base (no-prayer) rate per minute from the measurement
        const basePerMin = hasPrayer
            ? totalExp / PRAYER_MULT / durationMinutes
            : totalExp / durationMinutes;

        const noPrayer10 = Math.round(basePerMin * 10);
        const noPrayer60 = Math.round(basePerMin * 60);
        const withPrayer10 = Math.round(basePerMin * PRAYER_MULT * 10);
        const withPrayer60 = Math.round(basePerMin * PRAYER_MULT * 60);

        const remaining = Math.max(0, getExpToNext(currentLevel) - currentExp);
        const minsToLevelUp = remaining > 0 ? Math.ceil(remaining / basePerMin) : 0;

        return { noPrayer10, noPrayer60, withPrayer10, withPrayer60, minsToLevelUp };
    }, [durationMinutes, totalExp, hasPrayer, currentLevel, currentExp]);

    return (
        <div className="card">
            <header className="card-header">
                <span className="header-icon">⚡</span>
                <h1>經驗效率計算</h1>
            </header>

            <div className="form-body">
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
                        onChange={(e) => handleExpChange(e.target.value)}
                    />
                </div>

                <div className="field">
                    <label>時間段（分鐘）</label>
                    <input
                        type="number"
                        min={1}
                        value={durationMinutes}
                        onChange={(e) =>
                            setDurationMinutes(Math.max(1, Number(e.target.value)))
                        }
                    />
                </div>

                <div className="field">
                    <div className="field-label-row">
                        <label>
                            獲得經驗值&nbsp;
                            {totalExpInputMode === "number"
                                ? `(數值)`
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

                <div className="field">
                    <label className="prayer-checkbox-row">
                        <input
                            type="checkbox"
                            checked={hasPrayer}
                            onChange={(e) => setHasPrayer(e.target.checked)}
                        />
                        <span>測量期間有使用祈禱（經驗 ×1.25）</span>
                    </label>
                </div>
            </div>

            <div className="rate-result-section">
                <h2 className="rate-result-title">計算結果</h2>
                {result ? (
                    <>
                        <div className="rate-result-grid">
                            <div className="rate-grid-cell rate-grid-header" />
                            <div className="rate-grid-cell rate-grid-header">沒有祈禱</div>
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
                                以目前效率約{" "}
                                <strong>{formatMins(result.minsToLevelUp)}</strong>{" "}
                                升級（無祈禱）
                            </p>
                        )}
                    </>
                ) : (
                    <p className="no-result">請輸入時間段和經驗值</p>
                )}
            </div>
        </div>
    );
}
