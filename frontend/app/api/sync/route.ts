import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BrowserEvent } from '@/types/index';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const events: BrowserEvent[] = body.events;

        if (!events || !Array.isArray(events) || events.length === 0) {
            return NextResponse.json({ syncedIds: [] });
        }

        // Format for Supabase
        const dbEvents = events.map(e => ({
            event_id: e.id,
            user_id: user.id,
            event_type: e.type,
            domain: e.domain,
            classification: e.classification,
            timestamp: new Date(e.timestamp).toISOString(),
            focus_session_id: e.focusSessionId,
        }));

        // Perform upsert (ignoring duplicates based on event_id)
        const { error: dbError } = await supabase
            .from('tab_events')
            .upsert(dbEvents, { onConflict: 'event_id', ignoreDuplicates: true });

        if (dbError) {
            console.error("Sync Error:", dbError);
            return NextResponse.json({ error: dbError.message }, { status: 500 });
        }

        const syncedIds = events.map(e => e.id);
        return NextResponse.json({ syncedIds });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
