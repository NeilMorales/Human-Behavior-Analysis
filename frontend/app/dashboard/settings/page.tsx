'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface UserSettings {
    daily_goal_minutes: number;
    idle_threshold_seconds: number;
    notifications_enabled: boolean;
    work_duration: number;
    break_duration: number;
    long_break_duration: number;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<UserSettings>({
        daily_goal_minutes: 120,
        idle_threshold_seconds: 120,
        notifications_enabled: true,
        work_duration: 25,
        break_duration: 5,
        long_break_duration: 15,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        async function fetchSettings() {
            try {
                const response = await fetch('/api/settings');
                if (response.ok) {
                    const data = await response.json();
                    if (data.settings) {
                        setSettings(data.settings);
                    }
                }
            } catch (err) {
                console.error('Error fetching settings:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage('');

        try {
            const response = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });

            if (!response.ok) throw new Error('Failed to save settings');

            setMessage('Settings saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (err: any) {
            setMessage('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-accent-cyan border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl space-y-6">

            {message && (
                <div className={`p-4 rounded-lg ${
                    message.includes('Error') 
                        ? 'bg-red-500/10 border border-red-500/20 text-red-500' 
                        : 'bg-success/10 border border-success/20 text-success'
                }`}>
                    {message}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Focus Preferences</CardTitle>
                    <CardDescription>Customize your tracking and session rules</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h4 className="font-medium text-white mb-1">Daily Focus Goal</h4>
                            <p className="text-sm text-text-secondary">Your target productive time per day</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                value={settings.daily_goal_minutes || ''}
                                onChange={(e) => setSettings({...settings, daily_goal_minutes: parseInt(e.target.value) || 0})}
                                className="w-20 bg-bg-tertiary border border-border rounded-md px-3 py-2 text-white font-[family-name:var(--font-fira-code)] focus:border-accent-cyan outline-none" 
                            />
                            <span className="text-text-secondary text-sm">minutes</span>
                        </div>
                    </div>

                    <div className="h-px w-full bg-border" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h4 className="font-medium text-white mb-1">Idle Timeout</h4>
                            <p className="text-sm text-text-secondary">Stop counting time if inactive for this long</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                value={Math.floor(settings.idle_threshold_seconds / 60) || ''}
                                onChange={(e) => setSettings({...settings, idle_threshold_seconds: (parseInt(e.target.value) || 0) * 60})}
                                className="w-20 bg-bg-tertiary border border-border rounded-md px-3 py-2 text-white font-[family-name:var(--font-fira-code)] focus:border-accent-cyan outline-none" 
                            />
                            <span className="text-text-secondary text-sm">minutes</span>
                        </div>
                    </div>

                    <div className="h-px w-full bg-border" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h4 className="font-medium text-white mb-1">Notifications</h4>
                            <p className="text-sm text-text-secondary">Enable distraction alerts during focus sessions</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={settings.notifications_enabled}
                                onChange={(e) => setSettings({...settings, notifications_enabled: e.target.checked})}
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-cyan rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-cyan"></div>
                        </label>
                    </div>

                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Pomodoro Settings</CardTitle>
                    <CardDescription>Configure your Pomodoro timer durations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h4 className="font-medium text-white mb-1">Work Duration</h4>
                            <p className="text-sm text-text-secondary">Length of each focus block</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                value={settings.work_duration || ''}
                                onChange={(e) => setSettings({...settings, work_duration: parseInt(e.target.value) || 0})}
                                className="w-20 bg-bg-tertiary border border-border rounded-md px-3 py-2 text-white font-[family-name:var(--font-fira-code)] focus:border-accent-cyan outline-none" 
                            />
                            <span className="text-text-secondary text-sm">minutes</span>
                        </div>
                    </div>

                    <div className="h-px w-full bg-border" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h4 className="font-medium text-white mb-1">Short Break</h4>
                            <p className="text-sm text-text-secondary">Break between work blocks</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                value={settings.break_duration || ''}
                                onChange={(e) => setSettings({...settings, break_duration: parseInt(e.target.value) || 0})}
                                className="w-20 bg-bg-tertiary border border-border rounded-md px-3 py-2 text-white font-[family-name:var(--font-fira-code)] focus:border-accent-cyan outline-none" 
                            />
                            <span className="text-text-secondary text-sm">minutes</span>
                        </div>
                    </div>

                    <div className="h-px w-full bg-border" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h4 className="font-medium text-white mb-1">Long Break</h4>
                            <p className="text-sm text-text-secondary">Break after 4 work blocks</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                value={settings.long_break_duration || ''}
                                onChange={(e) => setSettings({...settings, long_break_duration: parseInt(e.target.value) || 0})}
                                className="w-20 bg-bg-tertiary border border-border rounded-md px-3 py-2 text-white font-[family-name:var(--font-fira-code)] focus:border-accent-cyan outline-none" 
                            />
                            <span className="text-text-secondary text-sm">minutes</span>
                        </div>
                    </div>

                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Domain Classifications</CardTitle>
                    <CardDescription>Override default site categorizations (Coming Soon)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-4 rounded-lg bg-bg-tertiary border border-dashed border-border text-center text-text-secondary">
                        Custom domain classification editor will be added in Phase 3
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
                <Button 
                    size="lg" 
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

        </div>
    );
}
