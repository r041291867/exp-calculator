export function readJSON<T>(key: string): T | null {
    try {
        const item = localStorage.getItem(key);
        return item !== null ? (JSON.parse(item) as T) : null;
    } catch {
        return null;
    }
}
