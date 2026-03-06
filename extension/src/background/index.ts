import { handleTabActivated, handleTabUpdated, handleWindowFocusChanged } from './tabTracker';
import { handleIdleStateChange } from './idleDetector';
import { handleAlarm, registerAlarms } from './alarmHandler';
import { handleNotificationButton } from './notificationManager';
import { handleInstalled, handleStartup } from './lifecycleHandler';
import { startSession, stopSession } from './sessionManager';
import { readStorage } from '../shared/storage';

// Tab tracking
chrome.tabs.onActivated.addListener(handleTabActivated);
chrome.tabs.onUpdated.addListener(handleTabUpdated);
chrome.windows.onFocusChanged.addListener(handleWindowFocusChanged);

// Idle
chrome.idle.onStateChanged.addListener(handleIdleStateChange);
chrome.idle.setDetectionInterval(120); // sync with user setting on settings change

// Alarms
chrome.alarms.onAlarm.addListener(handleAlarm);

// Notifications
chrome.notifications.onButtonClicked.addListener(handleNotificationButton);

// Lifecycle
chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onStartup.addListener(handleStartup);

// Register all alarms on startup (alarms survive browser restart, but re-register to be safe)
registerAlarms();

// Message listener for popup communication
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    // Handle async operations properly
    (async () => {
        try {
            switch (message.type) {
                case 'START_SESSION':
                    const session = await startSession(message.payload);
                    sendResponse({ success: true, session });
                    break;

                case 'STOP_SESSION':
                    const stoppedSession = await stopSession(message.payload);
                    sendResponse({ success: true, session: stoppedSession });
                    break;

                case 'GET_ACTIVE_SESSION':
                    const { activeSession } = await readStorage(['activeSession']);
                    sendResponse({ success: true, session: activeSession });
                    break;

                case 'PAUSE_SESSION':
                    // TODO: Implement pause functionality
                    sendResponse({ success: false, error: 'Pause not implemented yet' });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown message type' });
            }
        } catch (error: any) {
            console.error('Message handler error:', error);
            sendResponse({ success: false, error: error.message });
        }
    })();

    // Return true to indicate async response
    return true;
});
