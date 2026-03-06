import { DASHBOARD_URL } from './constants';
import { readStorage } from './storage';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
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

    if (response.status === 401) {
        // Logic for refresh token would go here, optionally retrying the request
        console.warn("Unauthorized access. Token might be expired.");
    }

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
}
