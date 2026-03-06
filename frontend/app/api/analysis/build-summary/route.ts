import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { date } = await request.json();
        const targetDate = date || new Date().toISOString().split('T')[0];

        // Build daily summary for the user and date
        const summary = await buildDailySummary(supabase, user.id, targetDate);

        return NextResponse.json({ summary });
    } catch (err: any) {
        console.error('Build summary error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

async function buildDailySummary(supabase: any, userId: string, date: string) {
    // 1. Get all tab events for this date
    const { data: events, error: eventsError } = await supabase
        .from('tab_events')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .order('timestamp_ms', { ascending: true });

    if (eventsError) throw eventsError;

    // 2. Get all focus sessions for this date
    const { data: sessions, error: sessionsError } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', `${date}T00:00:00`)
        .lt('start_time', `${date}T23:59:59`);

    if (sessionsError) throw sessionsError;

    // 3. Calculate metrics
    const totalFocusMinutes = sessions?.reduce((sum: number, s: any) => 
        sum + (s.actual_duration || 0), 0) || 0;
    
    const sessionsCount = sessions?.length || 0;
    
    const completedSessions = sessions?.filter((s: any) => s.status === 'completed').length || 0;
    const completionRate = sessionsCount > 0 ? completedSessions / sessionsCount : 0;

    // 4. Calculate time by classification
    let productiveTime = 0;
    let distractingTime = 0;
    let neutralTime = 0;
    let idleTime = 0;
    let tabSwitches = 0;

    if (events && events.length > 0) {
        for (let i = 0; i < events.length - 1; i++) {
            const current = events[i];
            const next = events[i + 1];
            
            if (current.event_type === 'tab_focus') {
                const durationMs = next.timestamp_ms - current.timestamp_ms;
                const durationMinutes = Math.floor(durationMs / 60000);
                
                if (current.classification === 'productive') {
                    productiveTime += durationMinutes;
                } else if (current.classification === 'distracting') {
                    distractingTime += durationMinutes;
                } else if (current.classification === 'neutral') {
                    neutralTime += durationMinutes;
                }
                
                tabSwitches++;
            } else if (current.event_type === 'idle_start' && next.event_type === 'idle_end') {
                const durationMs = next.timestamp_ms - current.timestamp_ms;
                idleTime += Math.floor(durationMs / 1000); // seconds
            }
        }
    }

    const totalOnlineTime = productiveTime + distractingTime + neutralTime;

    // 5. Calculate behavior score (0-100)
    let behaviorScore = 0;
    if (totalOnlineTime > 0) {
        const productiveRatio = productiveTime / totalOnlineTime;
        const distractingRatio = distractingTime / totalOnlineTime;
        const focusBonus = Math.min(totalFocusMinutes / 120, 1) * 20; // Up to 20 points for 2h focus
        const completionBonus = completionRate * 10; // Up to 10 points
        
        behaviorScore = Math.round(
            (productiveRatio * 50) + // Up to 50 points
            (1 - distractingRatio) * 20 + // Up to 20 points
            focusBonus +
            completionBonus
        );
        
        behaviorScore = Math.min(100, Math.max(0, behaviorScore));
    }

    // 6. Calculate 7-day rolling average
    const sevenDaysAgo = new Date(date);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: recentSummaries } = await supabase
        .from('daily_summaries')
        .select('behavior_score')
        .eq('user_id', userId)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .lt('date', date);

    const rolling7dScore = recentSummaries && recentSummaries.length > 0
        ? Math.round(recentSummaries.reduce((sum: number, s: any) => sum + s.behavior_score, behaviorScore) / (recentSummaries.length + 1))
        : behaviorScore;

    // 7. Upsert to daily_summaries
    const summary = {
        user_id: userId,
        date,
        total_focus_minutes: totalFocusMinutes,
        sessions_count: sessionsCount,
        completion_rate: completionRate,
        idle_time: idleTime,
        productive_time: productiveTime,
        distracting_time: distractingTime,
        neutral_time: neutralTime,
        total_online_time: totalOnlineTime,
        tab_switches: tabSwitches,
        behavior_score: behaviorScore,
        rolling_7d_score: rolling7dScore,
    };

    const { error: upsertError } = await supabase
        .from('daily_summaries')
        .upsert(summary, { onConflict: 'user_id,date' });

    if (upsertError) throw upsertError;

    return summary;
}
