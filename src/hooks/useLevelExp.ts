import { useMemo } from "react";
import { getExpToNext } from "../data/expTable";
import { useLocalStorage } from "./useLocalStorage";

export function useLevelExp() {
    const [currentLevel, setCurrentLevel] = useLocalStorage("char.level", 1);
    const [currentExp, setCurrentExp] = useLocalStorage("char.exp", 0);
    const [expInputMode, setExpInputMode] = useLocalStorage<"number" | "percent">("char.expMode", "number");

    const expToNextLevel = useMemo(() => getExpToNext(currentLevel), [currentLevel]);
    const maxCurrentExp = useMemo(() => expToNextLevel - 1, [expToNextLevel]);

    const expPercentValue = useMemo(() => {
        if (maxCurrentExp <= 0) return 0;
        return Math.round((currentExp / maxCurrentExp) * 10000) / 100;
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

export type SharedLevelExp = ReturnType<typeof useLevelExp>;
