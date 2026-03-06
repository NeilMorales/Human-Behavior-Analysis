import type { StorageSchema, BrowserEvent, UserSettings } from './types';

const STORAGE_VERSION = 1;

const DEFAULT_SETTINGS: UserSettings = {
    dailyGoalMinutes: 120,
    idleThresholdSeconds: 120,
    preferredCategories: [],
    notificationsEnabled: true,
    workDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    customClassifications: {},
};

export async function readStorage<K extends keyof StorageSchema>(
    keys: K[]
): Promise<Pick<StorageSchema, K>> {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, (result) => resolve(result as Pick<StorageSchema, K>));
    });
}

export async function writeStorage(data: Partial<StorageSchema>): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.set(data, resolve);
    });
}

export async function appendEvent(
    event: Omit<BrowserEvent, 'id' | 'synced'>
): Promise<void> {
    const fullEvent: BrowserEvent = {
        ...event,
        id: generateUUID(),
        synced: false,
    };

    const { eventLog } = await readStorage(['eventLog']);
    const log = eventLog ?? {};
    const dateEvents = log[event.date] ?? [];
    dateEvents.push(fullEvent);
    log[event.date] = dateEvents;

    await writeStorage({ eventLog: log });
}

export async function markEventsSynced(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    const { eventLog } = await readStorage(['eventLog']);
    if (!eventLog) return;
    for (const date of Object.keys(eventLog)) {
        eventLog[date] = eventLog[date].map(e =>
            idSet.has(e.id) ? { ...e, synced: true } : e
        );
    }
    await writeStorage({ eventLog });
}

// Check storage quota and warn if approaching limit
export async function checkStorageQuota(): Promise<void> {
    if (!chrome.storage.local.getBytesInUse) return;
    
    const bytesInUse = await chrome.storage.local.getBytesInUse();
    const quotaBytes = chrome.storage.local.QUOTA_BYTES || 10485760; // 10MB default
    const usagePercent = (bytesInUse / quotaBytes) * 100;
    
    console.log(`Storage usage: ${bytesInUse} bytes (${usagePercent.toFixed(1)}%)`);
    
    // Warn at 80%
    if (usagePercent > 80) {
        console.warn('Storage quota warning: Over 80% used');
        await purgeOldEvents();
    }
    
    // Force purge at 90%
    if (usagePercent > 90) {
        console.error('Storage quota critical: Over 90% used, forcing purge');
        await purgeOldEvents();
        await trimSessionHistory();
    }
}

// Purge events older than 30 days
export async function purgeOldEvents(): Promise<void> {
    const { eventLog } = await readStorage(['eventLog']);
    if (!eventLog) return;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const purgedLog: Record<string, BrowserEvent[]> = {};
    let purgedCount = 0;
    
    for (const date of Object.keys(eventLog)) {
        if (date >= cutoffDate) {
            purgedLog[date] = eventLog[date];
        } else {
            purgedCount += eventLog[date].length;
        }
    }
    
    if (purgedCount > 0) {
        console.log(`Purged ${purgedCount} events older than 30 days`);
        await writeStorage({ eventLog: purgedLog });
    }
}

// Keep only last 100 sessions in history
export async function trimSessionHistory(): Promise<void> {
    const { sessionHistory } = await readStorage(['sessionHistory']);
    if (!sessionHistory || sessionHistory.length <= 100) return;
    
    const trimmed = sessionHistory.slice(-100);
    const removedCount = sessionHistory.length - trimmed.length;
    
    console.log(`Trimmed ${removedCount} old sessions from history`);
    await writeStorage({ sessionHistory: trimmed });
}

// Run on extension install/update — migrate storage schema if needed
export async function migrateStorage(): Promise<void> {
    const { schemaVersion } = await readStorage(['schemaVersion']);
    if ((schemaVersion ?? 0) >= STORAGE_VERSION) return;
    // Apply migrations here as versions increase
    await writeStorage({ schemaVersion: STORAGE_VERSION, settings: DEFAULT_SETTINGS });
}

// Dummy UUID generator if it is missing from utils
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
