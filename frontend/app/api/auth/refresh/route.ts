import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const { refreshToken } = await request.json();

        if (!refreshToken) {
            return NextResponse.json({ error: 'Refresh token required' }, { status: 400 });
        }

        const supabase = await createClient();

        // Use Supabase's refresh session method
        const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refreshToken,
        });

        if (error || !data.session) {
            console.error('Token refresh error:', error);
            return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
        }

        return NextResponse.json({
            session: data.session,
            user: data.user,
        });
    } catch (err: any) {
        console.error('Refresh token error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
