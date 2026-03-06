import { readStorage, appendEvent } from '../shared/storage';
import { getTodayDate } from '../shared/utils';

export async function handleIdleStateChange(state: chrome.idle.IdleState | "active" | "idle" | "locked" | string) {
    const now = Date.now();
    const { activeSession } = await readStorage(['activeSession', 'settings']);
    const date = getTodayDate();

    if (state === 'idle' || state === 'locked') {
        // Write idle_start event
        await appendEvent({
            type: 'idle_start', domain: null, classification: null,
            timestamp: now, focusSessionId: activeSession?.id ?? null, date
        });
        // Pause tab timing — next heartbeat will not count this time
    }

    if (state === 'active') {
        // Write idle_end event
        await appendEvent({
            type: 'idle_end', domain: null, classification: null,
            timestamp: now, focusSessionId: activeSession?.id ?? null, date
        });
        // Resume tab timing
    }
}
