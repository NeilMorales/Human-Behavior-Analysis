import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        const updateData: any = {};
        if (body.endTime) updateData.end_time = new Date(body.endTime).toISOString();
        if (body.actualDuration !== undefined) updateData.actual_duration = body.actualDuration;
        if (body.status) updateData.status = body.status;
        if (body.idleTimeDuring !== undefined) updateData.idle_time_during = body.idleTimeDuring;
        if (body.interruptionCount !== undefined) updateData.interruption_count = body.interruptionCount;
        if (body.notes) updateData.notes = body.notes;
        if (body.selfRating !== undefined) updateData.self_rating = body.selfRating;
        if (body.focusScore !== undefined) updateData.focus_score = body.focusScore;

        const p = await params;
        const { data, error } = await supabase
            .from('focus_sessions')
            .update(updateData)
            .eq('session_id', p.id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ session: data });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
