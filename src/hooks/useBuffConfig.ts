import type { BuffConfig } from "../utils/aura";
import { usePersistedState } from "./usePersistedState";

export function useBuffConfig(
    key: string,
    migrate: () => BuffConfig,
): [BuffConfig, <K extends keyof BuffConfig>(field: K, value: BuffConfig[K]) => void] {
    const [config, setConfig] = usePersistedState<BuffConfig>(key, migrate);

    const setField = <K extends keyof BuffConfig>(field: K, value: BuffConfig[K]) =>
        setConfig((prev) => ({ ...prev, [field]: value }));

    return [config, setField];
}
