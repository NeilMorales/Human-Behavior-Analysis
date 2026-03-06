import type { Classification, UserSettings, BrowserEvent } from './types';
import { DEFAULT_CLASSIFICATIONS } from './constants';

export function parseDomain(url: string | undefined): string | null {
    if (!url) return null;
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return null;
    }
}

export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export function getTodayDate(timezone: string = 'UTC'): string {
    // Uses specified timezone to generate YYYY-MM-DD
    const dateOptions = { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' } as Intl.DateTimeFormatOptions;
    const parts = new Intl.DateTimeFormat('en-US', dateOptions).formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    return `${y}-${m}-${d}`;
}

export function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

export async function getClassification(domain: string, settings: UserSettings): Promise<Classification> {
    if (settings.customClassifications[domain]) {
        return settings.customClassifications[domain];
    }
    return DEFAULT_CLASSIFICATIONS[domain] || 'neutral';
}

export function getLastEventOfType(events: BrowserEvent[], type: string): BrowserEvent | null {
    if (!events || events.length === 0) return null;
    for (let i = events.length - 1; i >= 0; i--) {
        if (events[i].type === type) return events[i];
    }
    return null;
}
