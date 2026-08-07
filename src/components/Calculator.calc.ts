import { getCumulativeExp, getLevelFromCumExp } from "../data/expTable";
import { calcEffective, type BuffConfig, BUFF_DEFAULTS } from "../utils/aura";
import { readJSON } from "../utils/storage";

export function formatByDailyHours(totalMinutes: number, dailyHours: number): string {
    if (totalMinutes <= 0) return "0 分鐘";
    const total = Math.ceil(totalMinutes);
    const dailyMins = Math.round(dailyHours * 60);
    const fullDays = Math.floor(total / dailyMins);
    const remainMins = total % dailyMins;
    const remainHours = Math.floor(remainMins / 60);
    const remainFinalMins = remainMins % 60;

    const timePart =
        remainHours > 0
            ? remainFinalMins > 0
                ? `${remainHours}小時${remainFinalMins}分鐘`
                : `${remainHours}小時`
            : remainFinalMins > 0
              ? `${remainFinalMins}分鐘`
              : "";

    if (fullDays === 0) return timePart || "0分鐘";
    return timePart ? `${fullDays}天${timePart}` : `${fullDays}天`;
}

export function calcRemaining(currentLevel: number, currentExp: number, targetLevel: number): number | null {
    if (targetLevel <= currentLevel) return null;
    const targetCumulative = getCumulativeExp(targetLevel);
    const currentCumulative = getCumulativeExp(currentLevel) + currentExp;
    return Math.max(0, targetCumulative - currentCumulative);
}

export interface SessionConfig {
    id: string;
    buffConfig: BuffConfig;
    hours: number;
    loops: number;
}

export interface SessionContribution {
    id: string;
    effective: number;
    expGained: number;
}

export interface UnitsResult {
    totalExpGained: number;
    resultLevel: number;
    percent: number;
    expIntoLevel: number;
    expToNext: number;
    contributions: SessionContribution[];
}

export function calcSessionEffective(buffConfig: BuffConfig, hours: number): number {
    return calcEffective({ ...buffConfig, durationMinutes: Math.max(0, hours) * 60 });
}

export function calcUnitsResult(
    sessions: SessionConfig[],
    expPerInterval: number,
    intervalMinutes: number,
    refBuffConfig: BuffConfig,
    currentLevel: number,
    currentExp: number,
): UnitsResult | null {
    if (expPerInterval <= 0 || intervalMinutes <= 0) return null;

    const effectiveRef = calcEffective({ ...refBuffConfig, durationMinutes: intervalMinutes });
    const baseExpPerMinute = expPerInterval / effectiveRef / intervalMinutes;

    const contributions: SessionContribution[] = sessions.map((session) => {
        const effective = calcSessionEffective(session.buffConfig, session.hours);
        const expGained = session.hours > 0 ? baseExpPerMinute * effective * session.hours * 60 * session.loops : 0;
        return { id: session.id, effective, expGained };
    });

    const totalExpGained = contributions.reduce((sum, c) => sum + c.expGained, 0);
    if (totalExpGained <= 0) return null;

    const startCumExp = getCumulativeExp(currentLevel) + currentExp;
    const finalCumExp = startCumExp + totalExpGained;
    const { level, expIntoLevel, expToNext } = getLevelFromCumExp(finalCumExp);
    const percent = expToNext > 0 ? (expIntoLevel / expToNext) * 100 : 100;
    return { totalExpGained, resultLevel: level, percent, expIntoLevel, expToNext, contributions };
}

export const REF_BUFF_CONFIG_KEY = "calc.refBuffConfig";

export function migrateRefBuffConfig(): BuffConfig {
    return readJSON<BuffConfig>(REF_BUFF_CONFIG_KEY) ?? BUFF_DEFAULTS;
}

export const SESSIONS_KEY = "calc.sessions";
const LEGACY_HOURS_KEY = "calc.hours";

let sessionIdCounter = 0;
export function nextSessionId(): string {
    sessionIdCounter += 1;
    return `session-${Date.now()}-${sessionIdCounter}`;
}

export function makeSessionConfig(hours = 1): SessionConfig {
    return { id: nextSessionId(), buffConfig: { ...BUFF_DEFAULTS }, hours, loops: 1 };
}

export function migrateSessions(): SessionConfig[] {
    const existing = readJSON<SessionConfig[]>(SESSIONS_KEY);
    if (existing && existing.length > 0) return existing;

    const legacyHours = readJSON<number>(LEGACY_HOURS_KEY);
    return [makeSessionConfig(legacyHours ?? 1)];
}

export interface DaysResult {
    remaining: number;
    totalMinutes: number;
}

export function calcDaysResult(
    remaining: number | null,
    intervalMinutes: number,
    expPerInterval: number,
): DaysResult | null {
    if (remaining === null) return null;
    const sessions = remaining / expPerInterval;
    const totalMinutes = sessions * intervalMinutes;
    return { remaining, totalMinutes };
}

export type DailyResult = { remaining: number; days: number; expPerDay: number; minutesPerDay: number } | { error: string };

export function calcDailyResult(
    remaining: number | null,
    startDate: string,
    endDate: string,
    expPerInterval: number,
    intervalMinutes: number,
): DailyResult | null {
    if (remaining === null) return null;
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (days <= 0) return { error: "結束日期必須晚於開始日期" };
    const expPerDay = Math.ceil(remaining / days);
    const minutesPerDay = (expPerDay / expPerInterval) * intervalMinutes;
    return { remaining, days, expPerDay, minutesPerDay };
}
