import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const { accessToken, refreshToken } = await request.json();
        
        if (!accessToken) {
            return NextResponse.json({ error: 'No token provided' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const response = NextResponse.json({ success: true });

        // Create Supabase client with cookie handling
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set({ name, value, ...options });
                            response.cookies.set(name, value, options);
                        });
                    },
                },
            }
        );

        // Set the session using the provided tokens
        const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || accessToken,
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // Return response with cookies properly set
        return NextResponse.json({ success: true, user: data.user }, {
            headers: response.headers,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
