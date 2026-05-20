import { useState, useMemo } from "react";
import { getExpToNext } from "../data/expTable";

export function useLevelExp() {
    const [currentLevel, setCurrentLevel] = useState(1);
    const [currentExp, setCurrentExp] = useState(0);
    const [expInputMode, setExpInputMode] = useState<"number" | "percent">("number");

    const expToNextLevel = useMemo(() => getExpToNext(currentLevel), [currentLevel]);
    const maxCurrentExp = useMemo(() => expToNextLevel - 1, [expToNextLevel]);

    const expPercentValue = useMemo(() => {
        if (maxCurrentExp <= 0) return 0;
        return Math.round((currentExp / maxCurrentExp) * 1000) / 10;
    }, [currentExp, maxCurrentExp]);

    const handleExpChange = (raw: string) => {
        if (expInputMode === "percent") {
            const pct = Math.min(100, Math.max(0, Number(raw)));
            setCurrentExp(Math.round((pct / 100) * maxCurrentExp));
        } else {
            setCurrentExp(Math.min(Math.max(0, Number(raw)), maxCurrentExp));
        }
    };

    return {
        currentLevel, currentExp, expInputMode,
        expToNextLevel, maxCurrentExp, expPercentValue,
        setCurrentLevel, setCurrentExp, setExpInputMode,
        handleExpChange,
    };
}
