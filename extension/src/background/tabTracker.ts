import { readStorage, appendEvent, writeStorage } from '../shared/storage';
import { parseDomain, getTodayDate, getClassification, getLastEventOfType } from '../shared/utils';
import { fireInterruptionNotification } from './notificationManager';

// Interface for website visit tracking
interface WebsiteVisit {
    id: string;
    sessionId: string;
    domain: string;
    classification: string;
    startTime: number;
    endTime: number | null;
    durationSeconds: number | null;
    synced: boolean;
}

export async function handleTabActivated({ tabId }: { tabId: number, windowId?: number }) {
    const tab = await chrome.tabs.get(tabId);
    const domain = parseDomain(tab.url);
    const now = Date.now();

    // 1. Read current tracking state from storage
    const storage = await readStorage(['activeSession', 'settings', 'eventLog', 'websiteVisits']);
    const settings = storage.settings;
    const date = getTodayDate(settings?.timezone ?? 'UTC');

    // 2. Write tab_blur event for previous domain (if any) and update website visit
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

        // Update website visit with end time and duration
        if (storage.activeSession?.id && lastFocusEvent.domain) {
            await updateWebsiteVisit(
                storage.activeSession.id,
                lastFocusEvent.domain,
                lastFocusEvent.timestamp,
                now
            );
        }
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

        // Start new website visit tracking
        if (storage.activeSession?.id) {
            await startWebsiteVisit(
                storage.activeSession.id,
                domain,
                classification,
                now
            );
        }

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

// Helper function to start tracking a website visit
async function startWebsiteVisit(
    sessionId: string,
    domain: string,
    classification: string,
    startTime: number
): Promise<void> {
    const { websiteVisits = [] } = await readStorage(['websiteVisits']);
    
    // Check if there's already an active visit for this domain in this session
    const existingVisitIndex = websiteVisits.findIndex(
        v => v.sessionId === sessionId && v.domain === domain && v.endTime === null
    );
    
    if (existingVisitIndex === -1) {
        // Create new visit with proper UUID
        const { generateUUID } = await import('../shared/utils');
        const visit: WebsiteVisit = {
            id: generateUUID(),
            sessionId,
            domain,
            classification,
            startTime,
            endTime: null,
            durationSeconds: null,
            synced: false,
        };
        
        websiteVisits.push(visit);
        await writeStorage({ websiteVisits });
    }
}

// Helper function to update website visit with end time
async function updateWebsiteVisit(
    sessionId: string,
    domain: string,
    startTime: number,
    endTime: number
): Promise<void> {
    const { websiteVisits = [] } = await readStorage(['websiteVisits']);
    
    // Find the active visit for this domain in this session
    const visitIndex = websiteVisits.findIndex(
        v => v.sessionId === sessionId && 
             v.domain === domain && 
             v.endTime === null &&
             Math.abs(v.startTime - startTime) < 1000 // Within 1 second tolerance
    );
    
    if (visitIndex !== -1) {
        const durationSeconds = Math.round((endTime - websiteVisits[visitIndex].startTime) / 1000);
        
        websiteVisits[visitIndex] = {
            ...websiteVisits[visitIndex],
            endTime,
            durationSeconds,
        };
        
        await writeStorage({ websiteVisits });
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
        const { activeSession, settings, eventLog } = await readStorage(['activeSession', 'settings', 'eventLog']);
        const date = getTodayDate(settings?.timezone ?? 'UTC');

        // Close any active website visit
        const lastFocusEvent = getLastEventOfType(eventLog?.[date] ?? [], 'tab_focus');
        if (lastFocusEvent && activeSession?.id && lastFocusEvent.domain) {
            await updateWebsiteVisit(
                activeSession.id,
                lastFocusEvent.domain,
                lastFocusEvent.timestamp,
                now
            );
        }

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
