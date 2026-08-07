import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { flushSync } from "react-dom";
import { EXP_TABLE } from "../data/expTable";
import type { LevelExpView } from "../hooks/useLevelExp";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { usePersistedState } from "../hooks/usePersistedState";
import { useBuffConfig } from "../hooks/useBuffConfig";
import { formatNumber, formatMins } from "../utils/format";
import type { BuffConfig } from "../utils/aura";
import CollapsibleCard from "./shared/CollapsibleCard";
import BuffConfigFields from "./shared/BuffConfigFields";
import {
    formatByDailyHours,
    calcRemaining,
    calcUnitsResult,
    calcDaysResult,
    calcDailyResult,
    calcSessionEffective,
    makeSessionConfig,
    migrateSessions,
    migrateRefBuffConfig,
    REF_BUFF_CONFIG_KEY,
    SESSIONS_KEY,
} from "./Calculator.calc";

const TIME_INTERVAL_OPTIONS = [5, 10, 15, 20, 30, 60];
const TARGET_LEVEL_OPTIONS = EXP_TABLE.slice(1);

function getTodayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

export interface CalcHandle {
    activate(mins: number, exp: number): void;
}

const Calculator = forwardRef<CalcHandle, LevelExpView>(function Calculator({ currentLevel, currentExp }, ref) {
    const [calcMode, setCalcMode] = useLocalStorage<"days" | "daily" | "units">("calc.mode", "days");
    const [collapsed, setCollapsed] = useLocalStorage("calc.collapsed", false);
    const [targetLevel, setTargetLevel] = useLocalStorage("calc.targetLevel", 10);
    const [intervalMinutes, setIntervalMinutes] = useLocalStorage("calc.interval", 10);
    const [expPerInterval, setExpPerInterval] = useLocalStorage("calc.expPerInterval", 1000);
    const [dailyHours, setDailyHours] = useLocalStorage("calc.dailyHours", 2);
    const [startDate, setStartDate] = useLocalStorage("calc.startDate", getTodayStr());
    const [endDate, setEndDate] = useLocalStorage("calc.endDate", "");
    const [refBuffConfig, setRefBuffField] = useBuffConfig(REF_BUFF_CONFIG_KEY, migrateRefBuffConfig);
    const [sessions, setSessions] = usePersistedState(SESSIONS_KEY, migrateSessions);
    const [hasCalculated, setHasCalculated] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    function addSession() {
        setSessions((prev) => [...prev, makeSessionConfig()]);
        setHasCalculated(false);
    }

    function removeSession(id: string) {
        setSessions((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)));
        setHasCalculated(false);
    }

    function updateSession(id: string, patch: Partial<{ hours: number; loops: number }>) {
        setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
        setHasCalculated(false);
    }

    function setSessionBuffField<K extends keyof BuffConfig>(id: string, field: K, value: BuffConfig[K]) {
        setSessions((prev) =>
            prev.map((s) => (s.id === id ? { ...s, buffConfig: { ...s.buffConfig, [field]: value } } : s)),
        );
        setHasCalculated(false);
    }

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

    const remaining = useMemo(
        () => calcRemaining(currentLevel, currentExp, targetLevel),
        [currentLevel, currentExp, targetLevel],
    );

    const unitsResult = useMemo(
        () => calcUnitsResult(sessions, expPerInterval, intervalMinutes, refBuffConfig, currentLevel, currentExp),
        [sessions, expPerInterval, intervalMinutes, refBuffConfig, currentLevel, currentExp],
    );

    const daysResult = useMemo(
        () => calcDaysResult(remaining, intervalMinutes, expPerInterval),
        [remaining, intervalMinutes, expPerInterval],
    );

    const dailyResult = useMemo(
        () => calcDailyResult(remaining, startDate, endDate, expPerInterval, intervalMinutes),
        [remaining, startDate, endDate, expPerInterval, intervalMinutes],
    );

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
                    每天練多少
                </button>
                <button className={calcMode === "units" ? "active" : ""} onClick={() => switchMode("units")}>
                    會升到幾等
                </button>
            </div>

            <div className="form-body">
                {calcMode === "days" && <span className="sub-label">每天練功 X 小時，幾天後達標</span>}
                {calcMode === "daily" && <span className="sub-label">在目標時間內，每天要練多少</span>}
                {calcMode === "units" && (
                    <span className="sub-label">特定練功時間，會練到幾等(例如：練三天hot time會生到幾等)</span>
                )}
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
                        <label>此效率是否包含以下加成</label>
                        <BuffConfigFields config={refBuffConfig} setField={setRefBuffField} />
                    </div>
                )}

                {calcMode === "units" && (
                    <div className="field">
                        <label>練功設定</label>
                        <div className="session-config-list">
                            {sessions.map((session, idx) => {
                                const effective = calcSessionEffective(session.buffConfig, session.hours);
                                return (
                                    <div className="session-config-card" key={session.id}>
                                        <div className="session-config-header">
                                            <span className="session-config-title">設定 {idx + 1}</span>
                                            {sessions.length > 1 && (
                                                <button
                                                    className="session-config-remove"
                                                    onClick={() => removeSession(session.id)}
                                                    aria-label="刪除這組設定"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>

                                        <BuffConfigFields
                                            config={session.buffConfig}
                                            setField={(field, value) => setSessionBuffField(session.id, field, value)}
                                        />

                                        <div className="session-config-steppers">
                                            <div className="daily-hours-row">
                                                <span className="unit-label">練功</span>
                                                <button
                                                    className="stepper-btn"
                                                    onClick={() =>
                                                        updateSession(session.id, {
                                                            hours: Math.max(0.5, +(session.hours - 0.5).toFixed(1)),
                                                        })
                                                    }
                                                >
                                                    −
                                                </button>
                                                <input
                                                    type="number"
                                                    min={0.5}
                                                    step={0.5}
                                                    value={session.hours || ""}
                                                    style={{ textAlign: "center" }}
                                                    onChange={(e) =>
                                                        updateSession(session.id, { hours: Number(e.target.value) })
                                                    }
                                                    onBlur={() =>
                                                        updateSession(session.id, {
                                                            hours: Math.max(0.5, session.hours || 0.5),
                                                        })
                                                    }
                                                />
                                                <button
                                                    className="stepper-btn"
                                                    onClick={() =>
                                                        updateSession(session.id, {
                                                            hours: +(session.hours + 0.5).toFixed(1),
                                                        })
                                                    }
                                                >
                                                    +
                                                </button>
                                                <span className="unit-label">小時</span>
                                            </div>

                                            <div className="daily-hours-row">
                                                <span className="unit-label">Loop</span>
                                                <button
                                                    className="stepper-btn"
                                                    onClick={() =>
                                                        updateSession(session.id, {
                                                            loops: Math.max(1, session.loops - 1),
                                                        })
                                                    }
                                                >
                                                    −
                                                </button>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    step={1}
                                                    value={session.loops || ""}
                                                    style={{ textAlign: "center" }}
                                                    onChange={(e) =>
                                                        updateSession(session.id, {
                                                            loops: Math.round(Number(e.target.value)),
                                                        })
                                                    }
                                                    onBlur={() =>
                                                        updateSession(session.id, {
                                                            loops: Math.max(1, Math.round(session.loops) || 1),
                                                        })
                                                    }
                                                />
                                                <button
                                                    className="stepper-btn"
                                                    onClick={() =>
                                                        updateSession(session.id, { loops: session.loops + 1 })
                                                    }
                                                >
                                                    +
                                                </button>
                                                <span className="unit-label">次</span>
                                            </div>
                                        </div>

                                        <div className="rate-col-mult">
                                            <span className="effective-mult-label">等效倍率</span>
                                            <span className="effective-mult-value">×{effective.toFixed(3)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <button className="session-add-btn" onClick={addSession}>
                            ＋ 新增設定
                        </button>
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
                        <p className="no-result">請輸入小時數</p>
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
                            <div className="divider" />
                            <div className="session-breakdown">
                                {unitsResult.contributions.map((c, idx) => (
                                    <div className="session-breakdown-row" key={c.id}>
                                        <span className="session-breakdown-label">
                                            設定 {idx + 1}（×{c.effective.toFixed(3)}）
                                        </span>
                                        <span className="session-breakdown-value">
                                            {formatNumber(c.expGained)} 經驗
                                        </span>
                                    </div>
                                ))}
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
