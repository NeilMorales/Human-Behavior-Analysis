export interface DashboardData {
    score: number;
    level: string;
    scoreColor: string;
    cards: {
        focusTimeToday: number;
        sessionsToday: number;
        completionRate: number;
        idleTimeToday: number;
    };
    charts: {
        weeklyFocusTime: { date: string; minutes: number }[];
        topDomains: { domain: string; classification: string; totalSeconds: number; visitCount: number; date: string }[];
    };
    activeSession: any;
    anomalies: any[];
    insights: string[];
}

export async function getDashboardData(): Promise<DashboardData> {
    const res = await fetch('/api/analysis/dashboard');

    if (!res.ok) {
        // Return empty state if API fails (e.g. not logged in)
        return {
            score: 0,
            level: 'New',
            scoreColor: '#6b6b80',
            cards: {
                focusTimeToday: 0,
                sessionsToday: 0,
                completionRate: 0,
                idleTimeToday: 0,
            },
            charts: {
                weeklyFocusTime: [],
                topDomains: [],
            },
            activeSession: null,
            anomalies: [],
            insights: [],
        };
    }

    return res.json();
}
