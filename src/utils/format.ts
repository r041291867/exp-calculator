export function formatNumber(n: number): string {
    return n.toLocaleString("zh-TW");
}

export function formatMins(mins: number): string {
    if (mins <= 0) return "已達標";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} 分鐘`;
    if (m === 0) return `${h} 小時`;
    return `${h} 小時 ${m} 分鐘`;
}
