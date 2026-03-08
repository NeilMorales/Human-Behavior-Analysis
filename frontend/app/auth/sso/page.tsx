'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SSOContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState('');
    
    useEffect(() => {
        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refresh');
        
        if (!token) {
            router.push('/login');
            return;
        }

        // Exchange token for session
        fetch('/api/auth/exchange-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                accessToken: token,
                refreshToken: refreshToken || token 
            }),
            credentials: 'include', // Ensure cookies are included
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Wait for cookies to be committed before redirecting
                setTimeout(() => {
                    router.replace('/dashboard');
                }, 100);
            } else {
                setError(data.error || 'Authentication failed');
                setTimeout(() => router.push('/login'), 2000);
            }
        })
        .catch(err => {
            console.error('SSO error:', err);
            setError('Connection error. Redirecting to login...');
            setTimeout(() => router.push('/login'), 2000);
        });
    }, [searchParams, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-primary">
            <div className="text-center">
                {error ? (
                    <div className="text-red-500">{error}</div>
                ) : (
                    <>
                        <div className="animate-spin w-12 h-12 border-4 border-accent-cyan border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-text-secondary">Logging you in...</p>
                    </>
                )}
            </div>
        </div>
    );
}

export default function SSOPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-bg-primary">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-accent-cyan border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-text-secondary">Loading...</p>
                </div>
            </div>
        }>
            <SSOContent />
        </Suspense>
    );
}
