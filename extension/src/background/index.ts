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

// Poll for active sessions from dashboard every 30 seconds
async function pollActiveSession() {
    try {
        const { accessToken, activeSession: localSession } = await readStorage(['accessToken', 'activeSession']);
        
        if (!accessToken) return; // Not logged in
        
        // Check if there's an active session in the database
        const response = await fetch('http://localhost:3000/api/sessions/active', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            credentials: 'include',
        });
        
        if (response.ok) {
            const data = await response.json();
            const remoteSession = data.session;
            
            // If there's a remote session and we don't have it locally, sync it
            if (remoteSession && (!localSession || localSession.id !== remoteSession.session_id)) {
                console.log('Found active session from dashboard, syncing to extension:', remoteSession);
                
                // Import the session into extension storage with proper field mapping
                await chrome.storage.local.set({
                    activeSession: {
                        id: remoteSession.session_id,
                        userId: remoteSession.user_id,
                        taskName: remoteSession.task_name,
                        category: remoteSession.category,
                        mode: remoteSession.mode || 'free',
                        plannedDuration: remoteSession.planned_duration,
                        startTime: new Date(remoteSession.start_time).getTime(),
                        endTime: null,
                        actualDuration: null,
                        status: remoteSession.status || 'in_progress',
                        idleTimeDuring: 0,
                        interruptionCount: 0,
                        notes: null,
                        selfRating: null,
                        focusScore: null,
                        synced: true,
                    }
                });
            }
            
            // If we have a local session but no remote session, it might have been stopped from dashboard
            if (!remoteSession && localSession && localSession.status === 'in_progress') {
                console.log('Session was stopped from dashboard, clearing local session');
                await chrome.storage.local.remove('activeSession');
            }
        }
    } catch (error) {
        console.error('Failed to poll active session:', error);
    }
}

// Poll immediately on startup
pollActiveSession();

// Then poll every 30 seconds
setInterval(pollActiveSession, 30000);

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
                    // Handle stop from dashboard or popup
                    const payload = message.payload || { status: 'completed' };
                    const stoppedSession = await stopSession(payload);
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
