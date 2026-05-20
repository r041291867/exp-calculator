import { useState, useMemo, useEffect } from "react";
import { EXP_TABLE, getCumulativeExp } from "../data/expTable";
import type { SharedLevelExp } from "../hooks/useLevelExp";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { formatNumber } from "../utils/format";

const TIME_INTERVAL_OPTIONS = [5, 10, 15, 20, 30, 60];

function formatByDailyHours(totalMinutes: number, dailyHours: number): string {
    if (totalMinutes <= 0) return "0 分鐘";
    const total = Math.ceil(totalMinutes);
    const dailyMins = Math.round(dailyHours * 60);
    const fullDays = Math.floor(total / dailyMins);
    const remainMins = total % dailyMins;
    const remainHours = Math.floor(remainMins / 60);
    const remainFinalMins = remainMins % 60;

    const timePart =
        remainHours > 0
            ? remainFinalMins > 0
                ? `${remainHours}小時${remainFinalMins}分鐘`
                : `${remainHours}小時`
            : remainFinalMins > 0
              ? `${remainFinalMins}分鐘`
              : "";

    if (fullDays === 0) return timePart || "0分鐘";
    return timePart ? `${fullDays}天${timePart}` : `${fullDays}天`;
}

export default function Calculator({ currentLevel, currentExp }: SharedLevelExp) {
    const [targetLevel, setTargetLevel] = useLocalStorage("calc.targetLevel", 10);
    const [intervalMinutes, setIntervalMinutes] = useLocalStorage("calc.interval", 10);
    const [expPerInterval, setExpPerInterval] = useLocalStorage("calc.expPerInterval", 1000);
    const [dailyHours, setDailyHours] = useLocalStorage("calc.dailyHours", 2);
    const [hasCalculated, setHasCalculated] = useState(false);

    useEffect(() => {
        setHasCalculated(false);
        if (targetLevel <= currentLevel) setTargetLevel(Math.min(currentLevel + 1, 200));
    }, [currentLevel]);

    useEffect(() => {
        setHasCalculated(false);
    }, [currentExp]);

    const result = useMemo(() => {
        if (targetLevel <= currentLevel) return null;
        const targetCumulative = getCumulativeExp(targetLevel);
        const currentCumulative = getCumulativeExp(currentLevel) + currentExp;
        const remaining = Math.max(0, targetCumulative - currentCumulative);
        const sessions = remaining / expPerInterval;
        const totalMinutes = sessions * intervalMinutes;
        return { remaining, totalMinutes };
    }, [currentLevel, currentExp, targetLevel, intervalMinutes, expPerInterval]);

    const levelTableData = useMemo(() => {
        const endLevel = Math.min(targetLevel + 5, 200);
        return EXP_TABLE.filter((e) => e.level >= currentLevel && e.level <= endLevel);
    }, [currentLevel, targetLevel]);

    return (
        <div className="card calculator-card">
            <header className="card-header">
                <span className="header-icon">📊</span>
                <h1>升級時間計算</h1>
            </header>

            <div className="calculator-layout">
                <div className="calculator-left">
                    <div className="form-body">
                        <div className="field">
                            <div className="interval-row">
                                <div className="interval-col">
                                    <span className="sub-label">目前等級</span>
                                    <input type="number" value={currentLevel} disabled />
                                </div>
                                <div className="interval-col">
                                    <span className="sub-label">目標等級 (2-200)</span>
                                    <select
                                        value={targetLevel}
                                        onChange={(e) => {
                                            setTargetLevel(Number(e.target.value));
                                            setHasCalculated(false);
                                        }}
                                    >
                                        {EXP_TABLE.slice(1).map((entry) => (
                                            <option
                                                key={entry.level}
                                                value={entry.level}
                                                disabled={entry.level <= currentLevel}
                                            >
                                                {entry.level} 級
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="field">
                            <label>時間區間設定</label>
                            <div className="interval-row">
                                <div className="interval-col">
                                    <span className="sub-label">時間區間（分鐘）</span>
                                    <select
                                        value={intervalMinutes}
                                        onChange={(e) => {
                                            setIntervalMinutes(Number(e.target.value));
                                            setHasCalculated(false);
                                        }}
                                    >
                                        {TIME_INTERVAL_OPTIONS.map((m) => (
                                            <option key={m} value={m}>
                                                {m}分鐘
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="interval-col">
                                    <span className="sub-label">該時間經驗值</span>
                                    <input
                                        type="number"
                                        min={1}
                                        value={expPerInterval}
                                        onChange={(e) => {
                                            setExpPerInterval(Math.max(1, Number(e.target.value)));
                                            setHasCalculated(false);
                                        }}
                                    />
                                </div>
                            </div>
                            <p className="hint">選擇適合的時間區間，例如組隊任務通常需要更長時間</p>
                        </div>

                        <div className="field interval-row">
                            <div className="daily-hours-row">
                                <span className="unit-label">每天練功</span>
                                <button
                                    className="stepper-btn"
                                    onClick={() => setDailyHours((h) => Math.max(0.5, +(h - 0.5).toFixed(1)))}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    min={0.5}
                                    max={24}
                                    step={0.5}
                                    value={dailyHours}
                                    style={{ textAlign: "center" }}
                                    onChange={(e) => setDailyHours(Math.min(24, Math.max(0.5, Number(e.target.value))))}
                                />
                                <button
                                    className="stepper-btn"
                                    onClick={() => setDailyHours((h) => Math.min(24, +(h + 0.5).toFixed(1)))}
                                >
                                    +
                                </button>
                                <span className="unit-label">小時</span>
                            </div>
                        </div>
                    </div>

                    <div className="calc-bar">
                        <button className="calc-btn" onClick={() => setHasCalculated(true)}>
                            計算
                        </button>
                    </div>

                    <div className="result-card">
                        <h2>計算結果</h2>
                        {!hasCalculated ? (
                            <p className="no-result">點擊計算以查看結果</p>
                        ) : result ? (
                            <div className="result-items">
                                <div className="result-item">
                                    <span className="result-value">{formatNumber(result.remaining)}</span>
                                    <span className="result-label">還需經驗值</span>
                                </div>
                                <div className="divider" />
                                <div className="result-item">
                                    <span className="result-value">
                                        {formatByDailyHours(result.totalMinutes, dailyHours)}
                                    </span>
                                    <span className="result-label">預估天數</span>
                                    <span className="result-sublabel">每天 {dailyHours} 小時練功</span>
                                </div>
                            </div>
                        ) : (
                            <p className="no-result">請選擇高於目前等級的目標等級</p>
                        )}
                    </div>
                </div>
                {/* end calculator-left */}

                <div className="calculator-right">
                    <div className="level-table-section">
                        <h2 className="level-table-title">等級經驗參考（目前等級起後10等）</h2>
                        <div className="level-table-scroll">
                            <table className="level-table">
                                <thead>
                                    <tr>
                                        <th>等級</th>
                                        <th className="text-right">升級所需經驗</th>
                                        <th className="text-right">累計總經驗</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {levelTableData.map((entry) => (
                                        <tr
                                            key={entry.level}
                                            className={
                                                entry.level === currentLevel
                                                    ? "current-level-row"
                                                    : entry.level === targetLevel
                                                      ? "target-level-row"
                                                      : ""
                                            }
                                        >
                                            <td>{entry.level}</td>
                                            <td className="text-right">{formatNumber(entry.expToNext)}</td>
                                            <td className="text-right">{formatNumber(entry.cumulativeExp)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                {/* end calculator-right */}
            </div>
            {/* end calculator-layout */}
        </div>
    );
}
