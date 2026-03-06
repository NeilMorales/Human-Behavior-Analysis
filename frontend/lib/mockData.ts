export const USE_MOCK = true;

// Mock DashboardData type (to be expanded later if fully defined)
export interface DashboardData {
    score: number;
    level: string;
    scoreColor: string;
    cards: any;
    charts: any;
    activeSession: any;
    anomalies: any[];
    insights: string[];
}

export const mockData = {
    dashboard: {
        score: 78,
        level: 'Moderate',
        scoreColor: '#FFB800',
        cards: {
            focusTimeToday: 134,
            sessionsToday: 3,
            completionRate: 0.85,
            idleTimeToday: 45,
            productiveTimeToday: 180,
            distractingTimeToday: 30,
        },
        charts: {
            weeklyFocusTime: [
                { date: 'Mon', minutes: 120 },
                { date: 'Tue', minutes: 150 },
                { date: 'Wed', minutes: 90 },
                { date: 'Thu', minutes: 180 },
                { date: 'Fri', minutes: 134 },
                { date: 'Sat', minutes: 0 },
                { date: 'Sun', minutes: 0 },
            ],
            dailySessions: [
                { date: 'Mon', count: 2 },
                { date: 'Tue', count: 3 },
                { date: 'Wed', count: 1 },
                { date: 'Thu', count: 4 },
                { date: 'Fri', count: 3 },
                { date: 'Sat', count: 0 },
                { date: 'Sun', count: 0 },
            ],
            scoreTrend: [
                { date: '01', score: 60 },
                { date: '02', score: 65 },
                { date: '03', score: 80 },
                { date: '04', score: 85 },
                { date: '05', score: 78 },
                { date: '06', score: 78 },
                { date: '07', score: 78 },
            ],
            productivitySplit: { productive: 180, neutral: 60, distracting: 30 },
            topDomains: [
                { domain: 'github.com', classification: 'productive', totalSeconds: 3600, visitCount: 15, date: 'today' },
                { domain: 'youtube.com', classification: 'distracting', totalSeconds: 1200, visitCount: 8, date: 'today' },
            ]
        },
        activeSession: null,
        anomalies: [],
        insights: [
            "You are most productive on Thursdays.",
            "Great job maintaining your streak!",
        ]
    }
};
