import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ session: null });
        }

        // Get the most recent in_progress session
        const { data: session, error } = await supabase
            .from('focus_sessions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'in_progress')
            .eq('is_deleted', false)
            .order('start_time', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error fetching active session:', error);
            return NextResponse.json({ session: null });
        }

        // If session exists, calculate remaining time
        if (session) {
            const now = new Date().getTime();
            const startTime = new Date(session.start_time).getTime();
            const plannedEndTime = startTime + (session.planned_duration * 60 * 1000);
            const remainingMs = plannedEndTime - now;
            
            return NextResponse.json({ 
                session: {
                    ...session,
                    remainingMs: Math.max(0, remainingMs),
                    elapsedMs: now - startTime,
                }
            });
        }

        return NextResponse.json({ session: null });
    } catch (err: any) {
        console.error('Active session error:', err);
        return NextResponse.json({ session: null });
    }
}
