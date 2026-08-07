import { useMemo, useEffect, useState } from "react";
import type { LevelExpView } from "../hooks/useLevelExp";
import { useTotalExp } from "../hooks/useTotalExp";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { formatNumber, formatMins } from "../utils/format";
import ExpAmountField from "./shared/ExpAmountField";
import CollapsibleCard from "./shared/CollapsibleCard";
import Tooltip from "./shared/Tooltip";
import BuffConfigFields from "./shared/BuffConfigFields";
import type { BuffConfig } from "../utils/aura";
import {
    PRIMARY_BUFF_CONFIG_KEY,
    migratePrimaryBuffConfig,
    R2_BUFF_CONFIG_KEY,
    migrateR2BuffConfig,
    computeBaseRateResult,
} from "./BaseRateCalculator.calc";

interface BaseRateProps extends LevelExpView {
    onRateClick?: (mins: number, exp: number) => void;
}

interface RateSgProps {
    rate10: number;
    rate60: number;
    clickable: boolean;
    onRateClick?: (mins: number, exp: number) => void;
}

function RateSg({ rate10, rate60, clickable, onRateClick }: RateSgProps) {
    return (
        <div className="rate-sg">
            <div className="rate-grid-label">10 分鐘</div>
            <div
                className={`rate-grid-value${clickable ? " rate-sg-clickable" : ""}`}
                onClick={clickable ? () => onRateClick!(10, rate10) : undefined}
            >
                {formatNumber(rate10)}
            </div>
            <div className="rate-grid-label">60 分鐘</div>
            <div
                className={`rate-grid-value${clickable ? " rate-sg-clickable" : ""}`}
                onClick={clickable ? () => onRateClick!(60, rate60) : undefined}
            >
                {formatNumber(rate60)}
            </div>
        </div>
    );
}

function useBuffConfig(
    key: string,
    migrate: () => BuffConfig,
): [BuffConfig, <K extends keyof BuffConfig>(field: K, value: BuffConfig[K]) => void] {
    const [config, setConfig] = useState<BuffConfig>(migrate);

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(config));
        } catch {}
    }, [key, config]);

    const setField = <K extends keyof BuffConfig>(field: K, value: BuffConfig[K]) =>
        setConfig((prev) => ({ ...prev, [field]: value }));

    return [config, setField];
}

export default function BaseRateCalculator({ currentLevel, currentExp, expToNextLevel, onRateClick }: BaseRateProps) {
    const {
        totalExp,
        setTotalExp,
        totalExpInputMode,
        setTotalExpInputMode,
        totalExpPercentValue,
        handleTotalExpChange,
    } = useTotalExp(expToNextLevel, 100000, "base");

    const [durationMinutes, setDurationMinutes] = useLocalStorage("base.duration", 60);
    const [onlyEffectiveMult, setOnlyEffectiveMult] = useLocalStorage("base.onlyEffMult", false);

    const [buffConfig, setBuffField] = useBuffConfig(PRIMARY_BUFF_CONFIG_KEY, migratePrimaryBuffConfig);

    const [r2Collapsed, setR2Collapsed] = useLocalStorage("base.r2.collapsed", true);
    const [r2Config, setR2Field] = useBuffConfig(R2_BUFF_CONFIG_KEY, migrateR2BuffConfig);

    useEffect(() => {
        setTotalExp(0);
    }, [currentLevel]);

    const result = useMemo(
        () => computeBaseRateResult(buffConfig, r2Config, durationMinutes, totalExp, onlyEffectiveMult, currentLevel, currentExp),
        [durationMinutes, totalExp, buffConfig, r2Config, onlyEffectiveMult, currentLevel, currentExp],
    );

    const clickable = !!onRateClick;

    return (
        <CollapsibleCard storageKey="base.collapsed" icon="⚡" title="經驗效率分析" className="card-full">
            <div className="form-body">
                <div className="field">
                    <label className="prayer-checkbox-row">
                        <input
                            type="checkbox"
                            checked={onlyEffectiveMult}
                            onChange={(e) => setOnlyEffectiveMult(e.target.checked)}
                        />
                        <span>僅計算等效倍率</span>
                    </label>
                </div>

                <div className="field">
                    <label>統計時間（分鐘）</label>
                    <input
                        type="number"
                        min={1}
                        value={durationMinutes || ""}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        onBlur={() => setDurationMinutes((v) => Math.max(1, v || 1))}
                    />
                </div>

                {!onlyEffectiveMult && (
                    <ExpAmountField
                        labelBase="統計期間獲得經驗"
                        currentLevel={currentLevel}
                        value={totalExp}
                        percentValue={totalExpPercentValue}
                        mode={totalExpInputMode}
                        onModeChange={setTotalExpInputMode}
                        onChange={handleTotalExpChange}
                    />
                )}
            </div>

            <div className="rate-results-row">
                <div className="rate-col">
                    <h2 className="rate-result-title">統計期間倍率設定</h2>

                    <BuffConfigFields config={buffConfig} setField={setBuffField} />

                    {result && (result.type === "ok" || result.type === "mult-only") && (
                        <div className="rate-col-mult">
                            <span className="effective-mult-label">有效倍率</span>
                            <span className="effective-mult-value">×{result.effective.toFixed(3)}</span>
                        </div>
                    )}

                    {!onlyEffectiveMult &&
                        (!result ? (
                            <p className="no-result">請輸入統計時間和經驗值</p>
                        ) : result.type === "error" ? (
                            <p className="no-result">{result.msg}</p>
                        ) : result.type === "mult-only" ? (
                            <p className="no-result">請輸入統計期間獲得經驗</p>
                        ) : (
                            <>
                                <RateSg
                                    rate10={result.spot10}
                                    rate60={result.spot60}
                                    clickable={clickable}
                                    onRateClick={onRateClick}
                                />
                                {result.minsToLevelUpSpot > 0 && (
                                    <p className="level-up-hint">
                                        約 <strong>{formatMins(result.minsToLevelUpSpot)}</strong> 升級
                                    </p>
                                )}
                            </>
                        ))}
                </div>

                <div className={`r2-panel${r2Collapsed ? "" : " r2-panel--open"}`}>
                    <div className="r2-content">
                        <button className="r2-close-btn" onClick={() => setR2Collapsed(true)}>
                            ✕
                        </button>
                        <h2 className="rate-result-title">
                            不同倍率回推
                            <Tooltip content="例：用統計期間有氣場無祈禱的經驗，推估無氣場有祈禱時的經驗效率" />
                        </h2>
                        <BuffConfigFields config={r2Config} setField={setR2Field} />

                        {result && (result.type === "ok" || result.type === "mult-only") && (
                            <div className="rate-col-mult">
                                <span className="effective-mult-label">有效倍率</span>
                                <span className="effective-mult-value">×{result.r2Effective.toFixed(3)}</span>
                            </div>
                        )}

                        {!onlyEffectiveMult && result?.type === "ok" ? (
                            <>
                                <RateSg
                                    rate10={result.r2Rate10}
                                    rate60={result.r2Rate60}
                                    clickable={clickable}
                                    onRateClick={onRateClick}
                                />
                                {result.minsToLevelUpR2 > 0 && (
                                    <p className="level-up-hint">
                                        約 <strong>{formatMins(result.minsToLevelUpR2)}</strong> 升級
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="no-result">請輸入統計期間獲得經驗</p>
                        )}
                    </div>
                    <button className="r2-toggle-btn" onClick={() => setR2Collapsed(false)}>
                        回推計算
                    </button>
                </div>
            </div>
        </CollapsibleCard>
    );
}
