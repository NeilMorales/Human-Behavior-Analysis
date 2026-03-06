import { migrateStorage } from '../shared/storage';
import { checkOrphanSession } from './sessionManager';

export async function handleInstalled(details: chrome.runtime.InstalledDetails) {
    if (details.reason === 'install' || details.reason === 'update') {
        await migrateStorage();
    }
}

export async function handleStartup() {
    await checkOrphanSession();
}
