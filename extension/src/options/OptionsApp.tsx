import { useEffect, useState } from 'react';
import { readStorage, writeStorage } from '../shared/storage';
import type { UserSettings } from '../shared/types';

export default function OptionsApp() {
    const [settings, setSettings] = useState<UserSettings | null>(null);

    useEffect(() => {
        readStorage(['settings']).then(res => {
            if (res.settings) setSettings(res.settings);
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

    if (!settings) return <div style={{ padding: '24px', color: '#fff' }}>Loading settings...</div>;

    return (
        <div style={{ padding: '32px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif', color: '#eee', background: '#111', minHeight: '100vh' }}>
            <h1 style={{ color: '#00D1FF' }}>BehaviorIQ Settings</h1>

            <section style={{ marginBottom: '24px', background: '#222', padding: '16px', borderRadius: '8px' }}>
                <h2 style={{ fontSize: '18px', marginTop: 0 }}>General Settings</h2>
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px' }}>Daily Goal (Minutes)</label>
                    <input
                        type="number"
                        value={settings.dailyGoalMinutes}
                        onChange={e => handleChange('dailyGoalMinutes', Number(e.target.value))}
                        style={{ padding: '8px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '4px' }}>Idle Threshold (Seconds)</label>
                    <input
                        type="number"
                        value={settings.idleThresholdSeconds}
                        onChange={e => handleChange('idleThresholdSeconds', Number(e.target.value))}
                        style={{ padding: '8px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                    />
                </div>
            </section>

            <section style={{ marginBottom: '24px', background: '#222', padding: '16px', borderRadius: '8px' }}>
                <h2 style={{ fontSize: '18px', marginTop: 0 }}>Pomodoro Timer</h2>
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px' }}>Work Duration (Minutes)</label>
                    <input
                        type="number"
                        value={settings.workDuration}
                        onChange={e => handleChange('workDuration', Number(e.target.value))}
                        style={{ padding: '8px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                    />
                </div>
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px' }}>Break Duration (Minutes)</label>
                    <input
                        type="number"
                        value={settings.breakDuration}
                        onChange={e => handleChange('breakDuration', Number(e.target.value))}
                        style={{ padding: '8px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '4px' }}>Long Break Duration (Minutes)</label>
                    <input
                        type="number"
                        value={settings.longBreakDuration}
                        onChange={e => handleChange('longBreakDuration', Number(e.target.value))}
                        style={{ padding: '8px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
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
                    Enable Idle Alerts and Time Notifications
                </label>
            </section>

            <p style={{ color: '#888', fontSize: '12px', textAlign: 'center' }}>Changes are saved automatically.</p>
        </div>
    );
}

