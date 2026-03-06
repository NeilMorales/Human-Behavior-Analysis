export interface ScoreInput {
    focusTimeMinutes: number;       // Category B: total completed session time
    dailyGoalMinutes: number;       // from user settings, default 120
    completedSessions: number;      // Category B: sessions with status=completed
    totalSessions: number;          // Category B: all sessions (excl. abandoned)
    productiveTimeMinutes: number;  // Category A+C: time on productive domains
    totalOnlineMinutes: number;     // Category A: total active browser time
    activeDaysLast7: number;        // from daily_summaries: days with any activity
    idleSeconds: number;            // Category A: idle time during focus sessions
    totalFocusSeconds: number;      // Category B: total planned focus time
    interruptionCount: number;      // Category B+C: distracting switches during sessions
    plannedFocusSeconds: number;    // Category B: sum of all planned durations
}

export function computeScore(input: ScoreInput): number {
    // 1. Focus Time Ratio (20%)
    const focusScore = Math.min(input.focusTimeMinutes / input.dailyGoalMinutes, 1.0) * 20;

    // 2. Session Completion Rate (20%)
    const completionScore = input.totalSessions > 0
        ? (input.completedSessions / input.totalSessions) * 20 : 0;

    // 3. Productive Time Ratio (20%)
    const productiveScore = input.totalOnlineMinutes > 0
        ? Math.min(input.productiveTimeMinutes / input.totalOnlineMinutes, 1.0) * 20 : 0;

    // 4. Distraction Resistance (15%) — penalises interruptions during focus sessions
    const resistanceScore = input.plannedFocusSeconds > 0
        ? Math.max(0, 1 - (input.interruptionCount * 120) / input.plannedFocusSeconds) * 15 : 15;

    // 5. Consistency (15%) — active days out of last 7
    const consistencyScore = (input.activeDaysLast7 / 7) * 15;

    // 6. Idle Ratio (10%) — less idle during sessions = better
    const idleScore = input.totalFocusSeconds > 0
        ? Math.max(0, 1 - input.idleSeconds / input.totalFocusSeconds) * 10 : 10;

    return Math.round(focusScore + completionScore + productiveScore +
        resistanceScore + consistencyScore + idleScore);
}

export function getLevel(score: number): { label: string; color: string } {
    if (score >= 80) return { label: 'Highly Productive', color: '#00FF88' };
    if (score >= 50) return { label: 'Moderate', color: '#FFB800' };
    return { label: 'Low Productivity', color: '#FF4444' };
}
