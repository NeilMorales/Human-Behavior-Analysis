import { readStorage, writeStorage, appendEvent } from '../shared/storage';
import { generateUUID, getTodayDate } from '../shared/utils';
import type { FocusSession, SessionCategory, SessionMode } from '../shared/types';
import { ALARMS } from '../shared/constants';

export async function startSession(params: {
    taskName: string;
    category: SessionCategory;
    mode: SessionMode;
    plannedDuration: number;
}): Promise<FocusSession> {
    // 1. Check no session already running
    const { activeSession, user } = await readStorage(['activeSession', 'user']);
    if (activeSession?.status === 'in_progress') {
        throw new Error('A session is already in progress');
    }

    // 2. Create session object
    const session: FocusSession = {
        id: generateUUID(),
        userId: user?.id ?? null,
        taskName: params.taskName,
        category: params.category,
        mode: params.mode,
        plannedDuration: params.plannedDuration,
        startTime: Date.now(),
        endTime: null,
        actualDuration: null,
        status: 'in_progress',
        idleTimeDuring: 0,
        interruptionCount: 0,
        notes: null,
        selfRating: null,
        focusScore: null,
        synced: false,
    };

    // 3. Save to storage immediately
    await writeStorage({ activeSession: session });

    // 3.5. Sync active session to database immediately (if logged in)
    const { attemptSync } = await import('./syncManager');
    attemptSync().catch(err => console.error('Failed to sync active session:', err));

    // 4. Set alarm for planned end time
    const endTimeMinutes = params.plannedDuration;
    chrome.alarms.create(`session_end_${session.id}`, {
        delayInMinutes: endTimeMinutes
    });

    // 5. Set idle reminder alarm (5 minutes)
    chrome.alarms.create(ALARMS.IDLE_REMINDER, { delayInMinutes: 5 });

    // 6. Write session_start event
    await appendEvent({
        type: 'session_start', domain: null, classification: null,
        timestamp: session.startTime, focusSessionId: session.id,
        date: getTodayDate()
    });

    return session;
}

export async function stopSession(params: {
    status: 'completed' | 'interrupted';
    notes?: string;
    selfRating?: number;
}): Promise<FocusSession> {
    const { activeSession } = await readStorage(['activeSession']);
    if (!activeSession) throw new Error('No active session');

    const endTime = Date.now();
    const actualDurationMinutes = Math.min(
        Math.round((endTime - activeSession.startTime) / 60000),
        480 // cap at 8 hours
    );

    const completed: FocusSession = {
        ...activeSession,
        endTime,
        actualDuration: actualDurationMinutes,
        status: params.status,
        notes: params.notes ?? null,
        selfRating: params.selfRating ?? null,
        focusScore: null, // Computed on dashboard side
        synced: false,
    };

    // Save completed session to history
    const { sessionHistory } = await readStorage(['sessionHistory']);
    const history = sessionHistory || [];
    history.push(completed);
    
    // Keep only last 100 sessions in local storage
    const trimmedHistory = history.slice(-100);

    // Clear active session and save to history
    await writeStorage({ 
        activeSession: null,
        sessionHistory: trimmedHistory
    });

    // Clear alarms
    await chrome.alarms.clear(`session_end_${activeSession.id}`);
    await chrome.alarms.clear(ALARMS.IDLE_REMINDER);

    // Write session_end event
    await appendEvent({
        type: 'session_end', domain: null, classification: null,
        timestamp: endTime, focusSessionId: completed.id,
        date: getTodayDate()
    });

    // Trigger immediate sync to save session to database
    const { attemptSync } = await import('./syncManager');
    attemptSync().catch(err => console.error('Failed to sync session:', err));

    return completed;
}

export async function checkOrphanSession(): Promise<FocusSession | null> {
    const { activeSession } = await readStorage(['activeSession']);
    if (!activeSession) return null;

    const hoursElapsed = (Date.now() - activeSession.startTime) / 3600000;
    if (hoursElapsed > 8) {
        await stopSession({ status: 'interrupted' });
        return null;
    }

    return activeSession;
}

export async function autoCompleteSession(sessionId: string) {
    const { activeSession } = await readStorage(['activeSession']);
    if (activeSession && activeSession.id === sessionId) {
        await stopSession({ status: 'completed' });
    }
}
