import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST() {
    try {
        const supabase = await createClient();
        
        // Sign out from Supabase
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('Logout error:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // Clear all auth cookies
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        
        allCookies.forEach(cookie => {
            if (cookie.name.includes('supabase') || cookie.name.includes('auth')) {
                cookieStore.delete(cookie.name);
            }
        });

        return NextResponse.json({ success: true, message: 'Logged out successfully' });
    } catch (err: any) {
        console.error('Logout error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
