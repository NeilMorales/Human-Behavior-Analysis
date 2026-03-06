import { readStorage, writeStorage, markEventsSynced } from '../shared/storage';
import type { BrowserEvent, FocusSession } from '../shared/types';
import { DASHBOARD_URL } from '../shared/constants';

export async function attemptSync(): Promise<void> {
    const { accessToken } = await readStorage(['accessToken']);
    if (!accessToken) return; // not logged in
    if (!navigator.onLine) return; // no connection

    const { eventLog, sessionHistory, activeSession } = await readStorage(['eventLog', 'sessionHistory', 'activeSession']);
    if (!eventLog && !sessionHistory && !activeSession) return;

    const unsyncedEvents: BrowserEvent[] = [];
    const unsyncedSessions: FocusSession[] = [];

    // Collect unsynced events
    if (eventLog) {
        for (const date of Object.keys(eventLog)) {
            for (const event of eventLog[date]) {
                if (!event.synced) unsyncedEvents.push(event);
            }
        }
    }

    // Collect unsynced sessions (completed ones)
    if (sessionHistory) {
        for (const session of sessionHistory) {
            if (!session.synced && session.endTime) {
                unsyncedSessions.push(session);
            }
        }
    }

    // Add active session if not synced yet (for real-time sync)
    if (activeSession && !activeSession.synced) {
        unsyncedSessions.push(activeSession);
    }

    if (unsyncedEvents.length === 0 && unsyncedSessions.length === 0) return;

    try {
        // Sync events
        if (unsyncedEvents.length > 0) {
            const response = await fetch(`${DASHBOARD_URL}/api/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ events: unsyncedEvents }),
            });

            if (response.status === 401) {
                // Token expired — refresh logic to be implemented here
                return;
            }

            if (response.ok) {
                const { syncedIds }: { syncedIds: string[] } = await response.json();
                await markEventsSynced(syncedIds);
            }
        }

        // Sync sessions
        if (unsyncedSessions.length > 0) {
            for (const session of unsyncedSessions) {
                const response = await fetch(`${DASHBOARD_URL}/api/sessions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        id: session.id,
                        taskName: session.taskName,
                        category: session.category,
                        mode: session.mode,
                        plannedDuration: session.plannedDuration,
                        startTime: session.startTime,
                        endTime: session.endTime,
                        actualDuration: session.actualDuration,
                        status: session.status,
                        idleTimeDuring: session.idleTimeDuring,
                        interruptionCount: session.interruptionCount,
                        notes: session.notes,
                        selfRating: session.selfRating,
                    }),
                });

                if (response.ok) {
                    // Mark session as synced
                    session.synced = true;
                    
                    // If this is the active session, update it in storage
                    if (activeSession && activeSession.id === session.id) {
                        await writeStorage({ activeSession: { ...activeSession, synced: true } });
                    }
                }
            }

            // Update session history with synced flags
            if (sessionHistory) {
                await writeStorage({ sessionHistory: sessionHistory });
            }
        }

        await writeStorage({ lastSyncAt: Date.now() });

        // Purge old events feature can be implemented here...
    } catch (error) {
        console.error('Sync error:', error);
        // Network error — silent fail, retry in 5 minutes
    }
}
