import { readStorage, appendEvent, writeStorage } from '../shared/storage';
import { parseDomain, getTodayDate, getClassification, getLastEventOfType } from '../shared/utils';
import { fireInterruptionNotification } from './notificationManager';

export async function handleTabActivated({ tabId }: { tabId: number, windowId?: number }) {
    const tab = await chrome.tabs.get(tabId);
    const domain = parseDomain(tab.url);
    const now = Date.now();

    // 1. Read current tracking state from storage
    const storage = await readStorage(['activeSession', 'settings', 'eventLog']);
    const settings = storage.settings;
    const date = getTodayDate(settings?.timezone ?? 'UTC');

    // 2. Write tab_blur event for previous domain (if any)
    const lastFocusEvent = getLastEventOfType(storage.eventLog?.[date] ?? [], 'tab_focus');
    if (lastFocusEvent && !lastFocusEvent.domain?.startsWith('chrome://')) {
        await appendEvent({
            type: 'tab_blur',
            domain: lastFocusEvent.domain,
            classification: lastFocusEvent.classification,
            timestamp: now,
            focusSessionId: storage.activeSession?.id ?? null,
            date,
        });
    }

    // 3. Write tab_focus event for new domain
    if (domain && !domain.startsWith('chrome://')) {
        const classification = await getClassification(domain, settings);
        await appendEvent({
            type: 'tab_focus',
            domain,
            classification,
            timestamp: now,
            focusSessionId: storage.activeSession?.id ?? null,
            date,
        });

        // 4. If focus session active and new domain is distracting: increment interruption count
        if (storage.activeSession?.status === 'in_progress' && classification === 'distracting') {
            // Increment interruption count
            const updatedSession = {
                ...storage.activeSession,
                interruptionCount: storage.activeSession.interruptionCount + 1,
            };
            
            // Update in storage
            await writeStorage({ activeSession: updatedSession });
            
            // Fire notification
            await fireInterruptionNotification(domain, storage.activeSession.taskName);
        }
    }
}

export async function handleTabUpdated(
    tabId: number,
    changeInfo: { status?: string },
    tab: chrome.tabs.Tab
) {
    // Only care about complete navigations in the active tab
    if (changeInfo.status !== 'complete') return;
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id !== tabId) return;

    // Treat URL change in active tab same as tab activation
    await handleTabActivated({ tabId, windowId: tab.windowId });
}

export async function handleWindowFocusChanged(windowId: number) {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        // Browser lost focus
        const now = Date.now();
        const { activeSession, settings } = await readStorage(['activeSession', 'settings']);
        const date = getTodayDate(settings?.timezone ?? 'UTC');

        await appendEvent({
            type: 'window_blur', domain: null, classification: null,
            timestamp: now, focusSessionId: activeSession?.id ?? null, date
        });
    } else {
        // Browser gained focus
        const now = Date.now();
        const { activeSession, settings } = await readStorage(['activeSession', 'settings']);
        const date = getTodayDate(settings?.timezone ?? 'UTC');

        await appendEvent({
            type: 'window_focus', domain: null, classification: null,
            timestamp: now, focusSessionId: activeSession?.id ?? null, date
        });

        // Re-process active tab
        const [activeTab] = await chrome.tabs.query({ active: true, windowId });
        if (activeTab && activeTab.id) {
            handleTabActivated({ tabId: activeTab.id, windowId });
        }
    }
}
