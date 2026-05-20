import { useState, useMemo } from "react";

export function useTotalExp(expToNextLevel: number, initialValue = 100000) {
    const [totalExp, setTotalExp] = useState(initialValue);
    const [totalExpInputMode, setTotalExpInputMode] = useState<"number" | "percent">("number");

    const totalExpPercentValue = useMemo(() => {
        if (expToNextLevel <= 0) return 0;
        return Math.round((totalExp / expToNextLevel) * 1000) / 10;
    }, [totalExp, expToNextLevel]);

    const handleTotalExpChange = (raw: string) => {
        if (totalExpInputMode === "percent") {
            setTotalExp(Math.round(Math.max(0, Number(raw)) / 100 * expToNextLevel));
        } else {
            setTotalExp(Math.max(0, Number(raw)));
        }
    };

    return {
        totalExp, setTotalExp,
        totalExpInputMode, setTotalExpInputMode,
        totalExpPercentValue,
        handleTotalExpChange,
    };
}
