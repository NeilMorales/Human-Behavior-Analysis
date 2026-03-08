import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Simple in-memory cache for session validation (30 seconds TTL)
const sessionCache = new Map<string, { user: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                       request.nextUrl.pathname.startsWith('/signup') ||
                       request.nextUrl.pathname.startsWith('/auth/sso')
    const isApiRoute = request.nextUrl.pathname.startsWith('/api')

    // Allow API routes to handle their own auth
    if (isApiRoute) {
        return supabaseResponse
    }

    // Skip validation for SSO page
    if (request.nextUrl.pathname.startsWith('/auth/sso')) {
        return supabaseResponse
    }

    let user = null;

    // Check cache first
    const accessToken = request.cookies.get('sb-access-token')?.value;
    if (accessToken) {
        const cached = sessionCache.get(accessToken);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            user = cached.user;
        }
    }

    // If not in cache, validate with Supabase
    if (!user) {
        try {
            const { data: { user: validatedUser } } = await supabase.auth.getUser();
            user = validatedUser;
            
            // Cache the result
            if (user && accessToken) {
                sessionCache.set(accessToken, { user, timestamp: Date.now() });
            }
        } catch (error) {
            console.error('Middleware auth error:', error);
            // On error, allow the request to proceed if on auth page
            if (isAuthPage) {
                return supabaseResponse;
            }
        }
    }

    // If not logged in and trying to access protected page -> redirect to login
    if (!user && !isAuthPage) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        return NextResponse.redirect(redirectUrl)
    }

    // If logged in and on auth page -> redirect to dashboard
    if (user && isAuthPage) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        return NextResponse.redirect(redirectUrl)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
