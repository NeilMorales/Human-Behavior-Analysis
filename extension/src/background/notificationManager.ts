import { readStorage } from '../shared/storage';
import { ALARMS } from '../shared/constants';

export async function fireInterruptionNotification(
    domain: string,
    taskName: string
): Promise<void> {
    const { settings } = await readStorage(['settings']);
    if (!settings?.notificationsEnabled) return;

    chrome.notifications.create(`interruption_${Date.now()}`, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icons/icon48.png'),
        title: 'Focus Session Interrupted',
        message: `Hey, you switched to ${domain} during "${taskName}"`,
        priority: 1,
    });
}

export async function fireIdleReminderNotification(taskName: string): Promise<void> {
    const { settings } = await readStorage(['settings']);
    if (!settings?.notificationsEnabled) return;

    chrome.notifications.create('idle_reminder', {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icons/icon48.png'),
        title: 'Still working?',
        message: `Your session "${taskName}" is still running`,
        buttons: [
            { title: 'Yes, keep going' },
            { title: 'Stop session' }
        ],
        priority: 2,
        requireInteraction: true,
    });
}

// Handle button clicks on notifications
export async function handleNotificationButton(
    notificationId: string,
    buttonIndex: number
): Promise<void> {
    if (notificationId === 'idle_reminder') {
        if (buttonIndex === 0) {
            // "Yes, keep going" — reset idle reminder alarm
            chrome.alarms.create(ALARMS.IDLE_REMINDER, { delayInMinutes: 5 });
        } else {
            // Import stopSession dynamically or rely on sessionManager to handle it.
            // Easiest is to send a message so we don't have circular dependencies if they arise.
            chrome.runtime.sendMessage({ type: 'STOP_SESSION', status: 'interrupted' });
        }
        chrome.notifications.clear('idle_reminder');
    }
}
