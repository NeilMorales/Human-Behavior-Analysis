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
