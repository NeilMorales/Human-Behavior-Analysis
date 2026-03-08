import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: sessionId } = await params;

        // Fetch website visits for this session
        const { data: visits, error } = await supabase
            .from('website_visits')
            .select('*')
            .eq('session_id', sessionId)
            .eq('user_id', user.id)
            .order('start_time', { ascending: true });

        if (error) {
            console.error('Error fetching visits:', error);
            return NextResponse.json({ visits: [] });
        }

        return NextResponse.json({ visits: visits || [] });
    } catch (err: any) {
        console.error('Visits API error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
