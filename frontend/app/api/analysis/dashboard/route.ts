import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const today = new Date().toISOString().split('T')[0];

        // Get today's summary
        const { data: todaySummary } = await supabase
            .from('daily_summaries')
            .select('*')
            .eq('user_id', user.id)
            .eq('date', today)
            .maybeSingle();

        // Get last 7 days of summaries for weekly charts
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: weeklySummaries } = await supabase
            .from('daily_summaries')
            .select('*')
            .eq('user_id', user.id)
            .gte('date', sevenDaysAgo.toISOString().split('T')[0])
            .order('date', { ascending: true });

        // Get today's domain stats
        const { data: domainStats } = await supabase
            .from('domain_stats')
            .select('*')
            .eq('user_id', user.id)
            .eq('date', today)
            .order('total_seconds', { ascending: false })
            .limit(10);

        // Get today's sessions
        const { data: todaySessions } = await supabase
            .from('focus_sessions')
            .select('*')
            .eq('user_id', user.id)
            .gte('start_time', `${today}T00:00:00`)
            .order('start_time', { ascending: false });

        // Compute cards from today's summary (default to 0)
        const focusTimeToday = todaySummary?.total_focus_minutes ?? 0;
        const sessionsToday = todaySessions?.length ?? 0;
        const completedSessions = todaySessions?.filter((s: any) => s.status === 'completed').length ?? 0;
        const completionRate = sessionsToday > 0 ? completedSessions / sessionsToday : 0;
        const idleTimeToday = todaySummary?.total_idle_minutes ?? 0;

        // Compute score from today's summary (default to 0)
        const score = todaySummary?.behavior_score ?? 0;
        let level = 'New';
        let scoreColor = '#6b6b80';
        if (score >= 90) { level = 'Excellent'; scoreColor = '#00ff88'; }
        else if (score >= 70) { level = 'Good'; scoreColor = '#00d1ff'; }
        else if (score >= 50) { level = 'Moderate'; scoreColor = '#FFB800'; }
        else if (score > 0) { level = 'Needs Work'; scoreColor = '#ff4444'; }

        // Build weekly focus time chart
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyFocusTime = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dateStr = d.toISOString().split('T')[0];
            const summary = weeklySummaries?.find((s: any) => s.date === dateStr);
            return {
                date: dayNames[d.getDay()],
                minutes: summary?.total_focus_minutes ?? 0,
            };
        });

        // Build top domains list
        const topDomains = (domainStats ?? []).map((d: any) => ({
            domain: d.domain,
            classification: d.classification ?? 'neutral',
            totalSeconds: d.total_seconds ?? 0,
            visitCount: d.visit_count ?? 0,
            date: d.date,
        }));

        // Build insights (empty for new users)
        const insights: string[] = [];
        if (score > 0 && weeklySummaries && weeklySummaries.length > 1) {
            const scores = weeklySummaries.map((s: any) => s.behavior_score ?? 0);
            const avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
            if (avgScore > score) {
                insights.push(`Your score is below your weekly average of ${Math.round(avgScore)}. Try a focus session!`);
            } else {
                insights.push(`Great job! You're above your weekly average of ${Math.round(avgScore)}.`);
            }
        }

        const dashboardData = {
            score,
            level,
            scoreColor,
            cards: {
                focusTimeToday,
                sessionsToday,
                completionRate,
                idleTimeToday,
            },
            charts: {
                weeklyFocusTime,
                topDomains,
            },
            activeSession: null,
            anomalies: [],
            insights,
        };

        return NextResponse.json(dashboardData);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
