import { useState } from 'react';
import { writeStorage } from '../../shared/storage';
import { DASHBOARD_URL } from '../../shared/constants';

export function LoginForm({ onLoginSuccess }: { onLoginSuccess: () => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSignup, setIsSignup] = useState(false);
    const [name, setName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
            const body = isSignup 
                ? { name, email, password, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
                : { email, password };

            const response = await fetch(`${DASHBOARD_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                credentials: 'include', // IMPORTANT: This sets cookies on the dashboard domain
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            // Store auth tokens and user data in extension storage
            await writeStorage({
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
                user: {
                    id: data.user.id,
                    name: data.user.user_metadata?.name || name || email.split('@')[0],
                    email: data.user.email,
                    role: 'user',
                    timezone: data.user.user_metadata?.timezone || 'UTC',
                },
            });

            onLoginSuccess();
        } catch (err: any) {
            console.error('Auth error:', err);
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '16px' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#fff', textAlign: 'center' }}>
                {isSignup ? 'Create Account' : 'Login to BehaviorIQ'}
            </h2>

            {error && (
                <div style={{
                    padding: '8px',
                    marginBottom: '12px',
                    background: '#FF4444',
                    color: '#fff',
                    borderRadius: '4px',
                    fontSize: '12px',
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {isSignup && (
                    <input
                        type="text"
                        placeholder="Your Name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required={isSignup}
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '8px',
                            marginBottom: '8px',
                            boxSizing: 'border-box',
                            background: '#222',
                            color: '#fff',
                            border: '1px solid #444',
                            borderRadius: '4px',
                        }}
                    />
                )}

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '8px',
                        marginBottom: '8px',
                        boxSizing: 'border-box',
                        background: '#222',
                        color: '#fff',
                        border: '1px solid #444',
                        borderRadius: '4px',
                    }}
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '8px',
                        marginBottom: '12px',
                        boxSizing: 'border-box',
                        background: '#222',
                        color: '#fff',
                        border: '1px solid #444',
                        borderRadius: '4px',
                    }}
                />

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '10px',
                        background: loading ? '#555' : '#00D1FF',
                        color: loading ? '#999' : '#000',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        marginBottom: '8px',
                    }}
                >
                    {loading ? 'Please wait...' : (isSignup ? 'Sign Up' : 'Login')}
                </button>

                <button
                    type="button"
                    onClick={() => setIsSignup(!isSignup)}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '8px',
                        background: 'transparent',
                        color: '#00D1FF',
                        border: '1px solid #00D1FF',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                    }}
                >
                    {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                </button>
            </form>

            <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '11px', color: '#666' }}>
                Your data syncs with the dashboard at<br />
                <a href={DASHBOARD_URL} target="_blank" rel="noreferrer" style={{ color: '#00D1FF' }}>
                    {DASHBOARD_URL}
                </a>
            </div>
        </div>
    );
}
