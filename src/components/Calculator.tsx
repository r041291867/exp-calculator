import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { flushSync } from "react-dom";
import { EXP_TABLE, getCumulativeExp, getExpToNext } from "../data/expTable";
import type { SharedLevelExp } from "../hooks/useLevelExp";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { formatNumber, formatMins } from "../utils/format";
import CollapsibleCard from "./shared/CollapsibleCard";

const TIME_INTERVAL_OPTIONS = [5, 10, 15, 20, 30, 60];
const TARGET_LEVEL_OPTIONS = EXP_TABLE.slice(1);

function getLevelFromCumExp(cumExp: number): { level: number; expIntoLevel: number; expToNext: number } {
    let resultLevel = 1;
    let resultCumExp = 0;
    for (let i = 0; i < EXP_TABLE.length; i++) {
        if (EXP_TABLE[i].cumulativeExp > cumExp) break;
        resultLevel = EXP_TABLE[i].level;
        resultCumExp = EXP_TABLE[i].cumulativeExp;
    }
    const expToNext = getExpToNext(resultLevel);
    return { level: resultLevel, expIntoLevel: cumExp - resultCumExp, expToNext };
}

function getTodayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

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

export interface CalcHandle {
    activate(mins: number, exp: number): void;
}

const Calculator = forwardRef<CalcHandle, SharedLevelExp>(function Calculator({ currentLevel, currentExp }, ref) {
    const [calcMode, setCalcMode] = useLocalStorage<"days" | "daily" | "units">("calc.mode", "days");
    const [collapsed, setCollapsed] = useLocalStorage("calc.collapsed", false);
    const [targetLevel, setTargetLevel] = useLocalStorage("calc.targetLevel", 10);
    const [intervalMinutes, setIntervalMinutes] = useLocalStorage("calc.interval", 10);
    const [expPerInterval, setExpPerInterval] = useLocalStorage("calc.expPerInterval", 1000);
    const [dailyHours, setDailyHours] = useLocalStorage("calc.dailyHours", 2);
    const [startDate, setStartDate] = useLocalStorage("calc.startDate", getTodayStr());
    const [endDate, setEndDate] = useLocalStorage("calc.endDate", "");
    const [units, setUnits] = useLocalStorage("calc.units", 10);
    const [hasCalculated, setHasCalculated] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
        activate(mins: number, exp: number) {
            flushSync(() => {
                setIntervalMinutes(mins);
                setExpPerInterval(exp);
                setCollapsed(false);
                setHasCalculated(false);
            });
            cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        },
    }));

    useEffect(() => {
        setHasCalculated(false);
        if (targetLevel <= currentLevel) setTargetLevel(Math.min(currentLevel + 1, 200));
    }, [currentLevel]);

    useEffect(() => {
        setHasCalculated(false);
    }, [currentExp]);

    const remaining = useMemo(() => {
        if (targetLevel <= currentLevel) return null;
        const targetCumulative = getCumulativeExp(targetLevel);
        const currentCumulative = getCumulativeExp(currentLevel) + currentExp;
        return Math.max(0, targetCumulative - currentCumulative);
    }, [currentLevel, currentExp, targetLevel]);

    const unitsResult = useMemo(() => {
        if (units <= 0 || expPerInterval <= 0) return null;
        const totalExpGained = units * expPerInterval;
        const startCumExp = getCumulativeExp(currentLevel) + currentExp;
        const finalCumExp = startCumExp + totalExpGained;
        const { level, expIntoLevel, expToNext } = getLevelFromCumExp(finalCumExp);
        const percent = expToNext > 0 ? (expIntoLevel / expToNext) * 100 : 100;
        return { totalExpGained, resultLevel: level, percent, expIntoLevel, expToNext };
    }, [units, expPerInterval, currentLevel, currentExp]);

    const daysResult = useMemo(() => {
        if (remaining === null) return null;
        const sessions = remaining / expPerInterval;
        const totalMinutes = sessions * intervalMinutes;
        return { remaining, totalMinutes };
    }, [remaining, intervalMinutes, expPerInterval]);

    const dailyResult = useMemo(() => {
        if (remaining === null) return null;
        if (!startDate || !endDate) return null;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (days <= 0) return { error: "結束日期必須晚於開始日期" };
        const expPerDay = Math.ceil(remaining / days);
        const minutesPerDay = (expPerDay / expPerInterval) * intervalMinutes;
        return { remaining, days, expPerDay, minutesPerDay };
    }, [remaining, startDate, endDate, expPerInterval, intervalMinutes]);

    function switchMode(mode: "days" | "daily" | "units") {
        setCalcMode(mode);
        setHasCalculated(false);
    }

    return (
        <CollapsibleCard
            ref={cardRef}
            storageKey="calc.collapsed"
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            icon="📊"
            title="升級時間計算"
            className="calculator-card"
        >
            <div className="calc-mode-tabs">
                <button className={calcMode === "days" ? "active" : ""} onClick={() => switchMode("days")}>
                    升等要幾天
                </button>
                <button className={calcMode === "daily" ? "active" : ""} onClick={() => switchMode("daily")}>
                    每天要練多少
                </button>
                <button className={calcMode === "units" ? "active" : ""} onClick={() => switchMode("units")}>
                    練了多少％
                </button>
            </div>

            <div className="form-body">
                <div className="field">
                    <div className="interval-row">
                        <div className="interval-col">
                            <span className="sub-label">目前等級</span>
                            <input type="number" value={currentLevel} disabled />
                        </div>
                        {calcMode !== "units" && (
                            <div className="interval-col">
                                <span className="sub-label">目標等級 (2-200)</span>
                                <select
                                    value={targetLevel}
                                    onChange={(e) => {
                                        setTargetLevel(Number(e.target.value));
                                        setHasCalculated(false);
                                    }}
                                >
                                    {TARGET_LEVEL_OPTIONS.map((entry) => (
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
                        )}
                    </div>
                </div>

                {calcMode === "daily" && (
                    <div className="field">
                        <div className="interval-row">
                            <div className="interval-col">
                                <span className="sub-label">開始日期</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        setHasCalculated(false);
                                    }}
                                />
                            </div>
                            <div className="interval-col">
                                <span className="sub-label">結束日期</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        setHasCalculated(false);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="field">
                    <label>練功效率設定</label>
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
                            <span className="sub-label">區間內累計經驗</span>
                            <input
                                type="number"
                                min={1}
                                value={expPerInterval || ""}
                                onChange={(e) => {
                                    setExpPerInterval(Number(e.target.value));
                                    setHasCalculated(false);
                                }}
                                onBlur={() => setExpPerInterval((v) => Math.max(1, v || 1))}
                            />
                        </div>
                    </div>
                    <p className="hint">選擇適合的時間區間，例如組隊任務通常需要更長時間</p>
                </div>

                {calcMode === "units" && (
                    <div className="field">
                        <div className="interval-row">
                            <div className="interval-col">
                                <span className="sub-label">練幾個單位（1 單位 = {intervalMinutes} 分鐘）</span>
                                <input
                                    type="number"
                                    min={1}
                                    value={units || ""}
                                    onChange={(e) => {
                                        setUnits(Number(e.target.value));
                                        setHasCalculated(false);
                                    }}
                                    onBlur={() => setUnits((v) => Math.max(1, v || 1))}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {calcMode === "days" && (
                    <div className="field">
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
                                value={dailyHours || ""}
                                style={{ textAlign: "center" }}
                                onChange={(e) => setDailyHours(Math.min(24, Number(e.target.value)))}
                                onBlur={() => setDailyHours((v) => Math.min(24, Math.max(0.5, v || 0.5)))}
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
                )}
            </div>

            <div className="calc-bar">
                <button className="calc-btn" onClick={() => setHasCalculated(true)}>
                    計算
                </button>
            </div>

            <div className="result-card">
                <h2>計算結果</h2>
                {calcMode === "units" ? (
                    !hasCalculated ? (
                        <p className="no-result">點擊計算以查看結果</p>
                    ) : !unitsResult ? (
                        <p className="no-result">請輸入單位數量</p>
                    ) : (
                        <div className="result-items">
                            <div className="result-item">
                                <span className="result-value result-value--sm">
                                    {formatNumber(unitsResult.totalExpGained)}
                                </span>
                                <span className="result-label">獲得經驗值</span>
                            </div>
                            <div className="divider" />
                            <div className="result-item">
                                <span className="result-value">{unitsResult.resultLevel} 等</span>
                                <span className="result-label">{unitsResult.percent.toFixed(2)}%</span>
                                <span className="result-sublabel">
                                    {formatNumber(unitsResult.expIntoLevel)} / {formatNumber(unitsResult.expToNext)}{" "}
                                    經驗
                                </span>
                            </div>
                        </div>
                    )
                ) : calcMode === "days" ? (
                    !hasCalculated ? (
                        <p className="no-result">點擊計算以查看結果</p>
                    ) : daysResult ? (
                        <div className="result-items">
                            <div className="result-row">
                                <div className="result-item">
                                    <span className="result-value result-value--sm">
                                        {formatNumber(daysResult.remaining)}
                                    </span>
                                    <span className="result-label">所需經驗值</span>
                                </div>
                                <div className="result-item">
                                    <span className="result-value result-value--sm">
                                        {formatMins(Math.ceil(daysResult.totalMinutes))}
                                    </span>
                                    <span className="result-label">升級所需時間</span>
                                </div>
                            </div>
                            <div className="divider" />
                            <div className="result-item">
                                <span className="result-value">
                                    {formatByDailyHours(daysResult.totalMinutes, dailyHours)}
                                </span>
                                <span className="result-label">預估天數</span>
                            </div>
                        </div>
                    ) : (
                        <p className="no-result">請選擇高於目前等級的目標等級</p>
                    )
                ) : !hasCalculated ? (
                    <p className="no-result">點擊計算以查看結果</p>
                ) : remaining === null ? (
                    <p className="no-result">請選擇高於目前等級的目標等級</p>
                ) : !dailyResult ? (
                    <p className="no-result">請輸入開始及結束日期</p>
                ) : "error" in dailyResult ? (
                    <p className="no-result">{dailyResult.error}</p>
                ) : (
                    <div className="result-items">
                        <div className="result-row">
                            <div className="result-item">
                                <span className="result-label">總共</span>
                                <span className="result-value">{dailyResult.days}</span>
                                <span className="result-label">天</span>
                            </div>
                            <div className="result-item">
                                <span className="result-label">還需要</span>
                                <span className="result-value">{formatNumber(dailyResult.remaining)}</span>
                                <span className="result-label">經驗值</span>
                            </div>
                        </div>
                        <div className="divider" />
                        <div className="result-item">
                            <span className="result-label">每天需要練</span>
                            <span className="result-value result-value--sm">
                                {formatMins(Math.ceil(dailyResult.minutesPerDay))}
                            </span>
                            <span className="result-sublabel">每天 {formatNumber(dailyResult.expPerDay)} 經驗</span>
                        </div>
                    </div>
                )}
            </div>
        </CollapsibleCard>
    );
});

export default Calculator;
