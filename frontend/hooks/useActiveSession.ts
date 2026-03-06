'use client';

import { useEffect, useState } from 'react';

interface ActiveSession {
    session_id: string;
    task_name: string;
    category: string;
    planned_duration: number;
    start_time: string;
    status: string;
    remainingMs: number;
    elapsedMs: number;
}

export function useActiveSession() {
    const [session, setSession] = useState<ActiveSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        let pollInterval: NodeJS.Timeout;

        const fetchSession = async () => {
            try {
                const response = await fetch('/api/sessions/active');
                if (!response.ok) throw new Error('Failed to fetch session');
                
                const data = await response.json();
                
                if (mounted) {
                    setSession(data.session);
                    setError(null);
                    setLoading(false);
                }
            } catch (err: any) {
                if (mounted) {
                    setError(err.message);
                    setLoading(false);
                }
            }
        };

        // Initial fetch
        fetchSession();

        // Poll every 5 seconds
        pollInterval = setInterval(fetchSession, 5000);

        return () => {
            mounted = false;
            clearInterval(pollInterval);
        };
    }, []);

    return { session, loading, error };
}
