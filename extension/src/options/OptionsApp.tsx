import { useEffect, useState } from 'react';
import { readStorage, writeStorage } from '../shared/storage';
import type { UserSettings, StoredUser } from '../shared/types';
import { DASHBOARD_URL } from '../shared/constants';

export default function OptionsApp() {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [user, setUser] = useState<StoredUser | null>(null);
    const [lastSync, setLastSync] = useState<number | null>(null);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        readStorage(['settings', 'user', 'lastSyncAt']).then(res => {
            if (res.settings) setSettings(res.settings);
            if (res.user) setUser(res.user);
            if (res.lastSyncAt) setLastSync(res.lastSyncAt);
        });
    }, []);

    const handleChange = (key: keyof UserSettings, value: any) => {
        setSettings(prev => {
            if (!prev) return prev;
            const newSettings = { ...prev, [key]: value };
            writeStorage({ settings: newSettings });
            return newSettings;
        });
    };

    const handleLogout = async () => {
        if (!confirm('Are you sure you want to logout? Unsynced data will be lost.')) return;
        
        setLoggingOut(true);
        try {
            // Clear all auth data
            await writeStorage({
                accessToken: null,
                refreshToken: null,
                user: null,
            });
            
            // Reload to show login form
            window.location.reload();
        } catch (e) {
            console.error('Logout error:', e);
            setLoggingOut(false);
        }
    };

    const formatLastSync = (timestamp: number | null) => {
        if (!timestamp) return 'Never';
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        const days = Math.floor(hours / 24);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    };

    if (!settings) return <div style={{ padding: '24px', color: '#fff' }}>Loading settings...</div>;

    return (
        <div style={{ padding: '32px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif', color: '#eee', background: '#111', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ color: '#00D1FF', margin: 0 }}>BehaviorIQ Settings</h1>
                <a 
                    href={DASHBOARD_URL} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ color: '#00D1FF', textDecoration: 'none', fontSize: '14px' }}
                >
                    Open Dashboard ↗
                </a>
            </div>

            {/* Account Section */}
            {user && (
                <section style={{ marginBottom: '24px', background: '#222', padding: '16px', borderRadius: '8px' }}>
                    <h2 style={{ fontSize: '18px', marginTop: 0 }}>Account</h2>
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>Logged in as</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{user.name}</div>
                        <div style={{ fontSize: '14px', color: '#aaa' }}>{user.email}</div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>Last Sync</div>
                        <div style={{ fontSize: '14px' }}>{formatLastSync(lastSync)}</div>
                    </div>
                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        style={{
                            padding: '8px 16px',
                            background: '#FF4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loggingOut ? 'not-allowed' : 'pointer',
                            opacity: loggingOut ? 0.5 : 1,
                            fontWeight: 'bold',
                        }}
                    >
                        {loggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                </section>
            )}

            <section style={{ marginBottom: '24px', background: '#222', padding: '16px', borderRadius: '8px' }}>
                <h2 style={{ fontSize: '18px', marginTop: 0 }}>General Settings</h2>
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Daily Goal (Minutes)</label>
                    <input
                        type="number"
                        value={settings.dailyGoalMinutes}
                        onChange={e => handleChange('dailyGoalMinutes', Number(e.target.value))}
                        style={{ padding: '8px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', width: '100px' }}
                    />
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Target productive time per day</div>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Idle Threshold (Seconds)</label>
                    <input
                        type="number"
                        value={settings.idleThresholdSeconds}
                        onChange={e => handleChange('idleThresholdSeconds', Number(e.target.value))}
                        style={{ padding: '8px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', width: '100px' }}
                    />
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Stop counting time after this many seconds of inactivity</div>
                </div>
            </section>

            <section style={{ marginBottom: '24px', background: '#222', padding: '16px', borderRadius: '8px' }}>
                <h2 style={{ fontSize: '18px', marginTop: 0 }}>Pomodoro Timer</h2>
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Work Duration (Minutes)</label>
                    <input
                        type="number"
                        value={settings.workDuration}
                        onChange={e => handleChange('workDuration', Number(e.target.value))}
                        style={{ padding: '8px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', width: '100px' }}
                    />
                </div>
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Break Duration (Minutes)</label>
                    <input
                        type="number"
                        value={settings.breakDuration}
                        onChange={e => handleChange('breakDuration', Number(e.target.value))}
                        style={{ padding: '8px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', width: '100px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Long Break Duration (Minutes)</label>
                    <input
                        type="number"
                        value={settings.longBreakDuration}
                        onChange={e => handleChange('longBreakDuration', Number(e.target.value))}
                        style={{ padding: '8px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', width: '100px' }}
                    />
                </div>
            </section>

            <section style={{ marginBottom: '24px', background: '#222', padding: '16px', borderRadius: '8px' }}>
                <h2 style={{ fontSize: '18px', marginTop: 0 }}>Notifications</h2>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={settings.notificationsEnabled}
                        onChange={e => handleChange('notificationsEnabled', e.target.checked)}
                        style={{ width: '16px', height: '16px' }}
                    />
                    Enable distraction alerts during focus sessions
                </label>
            </section>

            <section style={{ marginBottom: '24px', background: '#222', padding: '16px', borderRadius: '8px' }}>
                <h2 style={{ fontSize: '18px', marginTop: 0 }}>Domain Classifications</h2>
                <p style={{ fontSize: '14px', color: '#aaa', margin: '0 0 12px 0' }}>
                    Custom domain classification editor will be available in Phase 3
                </p>
                <div style={{ padding: '16px', background: '#333', borderRadius: '4px', border: '1px dashed #555', textAlign: 'center', color: '#888' }}>
                    Coming Soon
                </div>
            </section>

            <p style={{ color: '#888', fontSize: '12px', textAlign: 'center', marginTop: '32px' }}>
                ✓ Changes are saved automatically
            </p>
        </div>
    );
}

