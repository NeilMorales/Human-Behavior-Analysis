import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const visits = body.visits;

        if (!visits || !Array.isArray(visits) || visits.length === 0) {
            return NextResponse.json({ success: true, syncedCount: 0 });
        }

        // Format for Supabase
        const dbVisits = visits.map(v => ({
            visit_id: v.id,
            session_id: v.sessionId,
            user_id: user.id,
            domain: v.domain,
            classification: v.classification,
            start_time: new Date(v.startTime).toISOString(),
            end_time: v.endTime ? new Date(v.endTime).toISOString() : null,
            duration_seconds: v.durationSeconds,
        }));

        // Perform upsert (update on conflict)
        const { error: dbError } = await supabase
            .from('website_visits')
            .upsert(dbVisits, { 
                onConflict: 'session_id,domain,start_time',
                ignoreDuplicates: false 
            });

        if (dbError) {
            console.error("Website visits sync error:", dbError);
            return NextResponse.json({ error: dbError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, syncedCount: visits.length });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
