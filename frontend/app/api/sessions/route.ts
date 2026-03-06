import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('focus_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('start_time', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ sessions: data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Check if session already exists (update) or needs to be created (insert)
        const { data: existingSession } = await supabase
            .from('focus_sessions')
            .select('session_id')
            .eq('session_id', body.id)
            .maybeSingle();

        if (existingSession) {
            // Update existing session
            const updateData: any = {
                task_name: body.taskName,
                category: body.category,
                mode: body.mode,
                planned_duration: body.plannedDuration,
                status: body.status,
            };

            if (body.endTime) {
                updateData.end_time = new Date(body.endTime).toISOString();
                updateData.actual_duration = body.actualDuration;
                updateData.idle_time_during = body.idleTimeDuring || 0;
                updateData.interruption_count = body.interruptionCount || 0;
                updateData.notes = body.notes;
                updateData.self_rating = body.selfRating;
            }

            const { error: updateError, data } = await supabase
                .from('focus_sessions')
                .update(updateData)
                .eq('session_id', body.id)
                .select()
                .single();

            if (updateError) {
                return NextResponse.json({ error: updateError.message }, { status: 400 });
            }

            return NextResponse.json({ session: data });
        } else {
            // Insert new session
            const { error: insertError, data } = await supabase
                .from('focus_sessions')
                .insert({
                    session_id: body.id,
                    user_id: user.id,
                    task_name: body.taskName,
                    category: body.category,
                    mode: body.mode,
                    planned_duration: body.plannedDuration,
                    start_time: new Date(body.startTime).toISOString(),
                    status: body.status,
                })
                .select()
                .single();

            if (insertError) {
                return NextResponse.json({ error: insertError.message }, { status: 400 });
            }

            return NextResponse.json({ session: data });
        }

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
