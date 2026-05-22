import { useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";

export function useTotalExp(expToNextLevel: number, initialValue = 100000, keyPrefix = "rate") {
    const [totalExp, setTotalExp] = useLocalStorage(`${keyPrefix}.totalExp`, initialValue);
    const [totalExpInputMode, setTotalExpInputMode] = useLocalStorage<"number" | "percent">(
        `${keyPrefix}.totalExpMode`,
        "percent",
    );

    const totalExpPercentValue = useMemo(() => {
        if (expToNextLevel <= 0) return 0;
        return Math.round((totalExp / expToNextLevel) * 10000) / 100;
    }, [totalExp, expToNextLevel]);

    const handleTotalExpChange = (raw: string) => {
        if (totalExpInputMode === "percent") {
            setTotalExp(Math.round((Math.max(0, Number(raw)) / 100) * expToNextLevel));
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
