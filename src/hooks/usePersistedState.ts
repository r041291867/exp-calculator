import { useState, useEffect, type Dispatch, type SetStateAction } from "react";

export function usePersistedState<T>(key: string, init: () => T): [T, Dispatch<SetStateAction<T>>] {
    const [value, setValue] = useState<T>(init);

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {}
    }, [key, value]);

    return [value, setValue];
}
