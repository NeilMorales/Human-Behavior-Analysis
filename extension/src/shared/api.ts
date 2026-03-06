import { DASHBOARD_URL } from './constants';
import { readStorage, writeStorage } from './storage';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
    // Prevent multiple simultaneous refresh attempts
    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            const { refreshToken } = await readStorage(['refreshToken']);
            
            if (!refreshToken) {
                console.error('No refresh token available');
                return null;
            }

            const response = await fetch(`${DASHBOARD_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            
            // Store new tokens
            await writeStorage({
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
            });

            return data.session.access_token;
        } catch (error) {
            console.error('Token refresh error:', error);
            // Clear invalid tokens
            await writeStorage({
                accessToken: null,
                refreshToken: null,
                user: null,
            });
            return null;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

export async function apiFetch(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
    const { accessToken } = await readStorage(['accessToken']);

    const headers = {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(options.headers || {}),
    };

    const response = await fetch(`${DASHBOARD_URL}${endpoint}`, {
        ...options,
        headers,
    });

    // Handle 401 Unauthorized - token expired
    if (response.status === 401 && retryCount === 0) {
        console.log('Token expired, attempting refresh...');
        
        const newToken = await refreshAccessToken();
        
        if (newToken) {
            // Retry the request with new token
            return apiFetch(endpoint, options, retryCount + 1);
        } else {
            throw new Error('Authentication failed. Please login again.');
        }
    }

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
}
