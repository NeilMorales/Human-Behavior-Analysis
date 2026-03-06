import { attemptSync } from './syncManager';
import { autoCompleteSession } from './sessionManager';
import { readStorage, appendEvent } from '../shared/storage';
import { fireIdleReminderNotification } from './notificationManager';
import { getTodayDate } from '../shared/utils';
import { ALARMS } from '../shared/constants';

export function registerAlarms() {
    chrome.alarms.create(ALARMS.HEARTBEAT, { periodInMinutes: 1 });
    chrome.alarms.create(ALARMS.SYNC, { periodInMinutes: 5 });
}

export async function handleAlarm(alarm: chrome.alarms.Alarm) {
    switch (alarm.name) {
        case ALARMS.HEARTBEAT:
            await handleHeartbeat();
            break;
        case ALARMS.SYNC:
            await attemptSync();
            break;
        case ALARMS.IDLE_REMINDER:
            await handleIdleReminder();
            break;
        default:
            if (alarm.name.startsWith('session_end_')) {
                await autoCompleteSession(alarm.name.replace('session_end_', ''));
            }
    }
}

async function handleHeartbeat() {
    const now = Date.now();
    const { activeSession } = await readStorage(['activeSession']);
    const date = getTodayDate();

    await appendEvent({
        type: 'heartbeat', domain: null, classification: null,
        timestamp: now, focusSessionId: activeSession?.id ?? null, date
    });
}

async function handleIdleReminder() {
    const { activeSession } = await readStorage(['activeSession']);
    if (activeSession) {
        await fireIdleReminderNotification(activeSession.taskName);
    }
}
