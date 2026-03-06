'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Square } from 'lucide-react';
import { useActiveSession } from '@/hooks/useActiveSession';

export default function FocusModePage() {
    const { session: activeSession } = useActiveSession();
    const [taskName, setTaskName] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);

    // Update timer every second
    useEffect(() => {
        if (!activeSession) {
            setTimeLeft(0);
            return;
        }

        const updateTimer = () => {
            const now = Date.now();
            const startTime = new Date(activeSession.start_time).getTime();
            const plannedEndTime = startTime + (activeSession.planned_duration * 60 * 1000);
            const remaining = Math.max(0, plannedEndTime - now);
            setTimeLeft(Math.floor(remaining / 1000)); // Convert to seconds
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [activeSession]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const handleStart = async () => {
        if (!taskName.trim()) return;
        
        try {
            // This will be handled by extension for now
            // In future, we can start sessions from dashboard too
            alert('Please start sessions from the extension popup for now');
        } catch (e) {
            console.error(e);
        }
    };

    const handleStop = async () => {
        if (!activeSession) return;
        
        try {
            const response = await fetch(`/api/sessions/${activeSession.session_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'completed',
                    endTime: Date.now(),
                    actualDuration: Math.floor((Date.now() - new Date(activeSession.start_time).getTime()) / 60000),
                }),
            });

            if (!response.ok) throw new Error('Failed to stop session');
            
            // Refresh page to update UI
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert('Failed to stop session');
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 pt-10">

            <div className="text-center space-y-2 mb-10">
                <h1 className="text-3xl font-bold text-white tracking-tight">Focus Session</h1>
                <p className="text-text-secondary">
                    {activeSession ? 'Session in progress' : 'Start a dedicated focus block to improve your score'}
                </p>
            </div>

            <Card className="border-accent-violet/20 shadow-lg shadow-accent-violet/5">
                <CardContent className="p-10 flex flex-col items-center justify-center space-y-8">

                    {activeSession ? (
                        <>
                            <div className="text-center space-y-4 w-full">
                                <div className="text-accent-cyan text-sm font-bold tracking-wider">
                                    ● IN PROGRESS
                                </div>
                                <div className="text-xl text-white font-medium">
                                    {activeSession.task_name}
                                </div>
                                <div className="text-sm text-text-secondary">
                                    {activeSession.category}
                                </div>
                            </div>

                            <div className="text-8xl font-black text-white font-[family-name:var(--font-fira-code)] tracking-tighter">
                                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                            </div>

                            <Button
                                variant="danger"
                                size="lg"
                                className="w-40 rounded-full h-14 text-lg font-bold shadow-lg"
                                onClick={handleStop}
                            >
                                <Square className="w-5 h-5 mr-2 fill-current" /> Stop
                            </Button>
                        </>
                    ) : (
                        <>
                            <input
                                type="text"
                                placeholder="What are you working on?"
                                value={taskName}
                                onChange={(e) => setTaskName(e.target.value)}
                                className="w-full max-w-sm bg-bg-tertiary border border-border rounded-lg px-4 py-3 text-white text-center text-lg focus:outline-none focus:border-accent-cyan transition-colors"
                            />

                            <div className="text-6xl font-black text-white font-[family-name:var(--font-fira-code)] tracking-tighter opacity-50">
                                25:00
                            </div>

                            <Button
                                size="lg"
                                className="w-40 rounded-full h-14 text-lg font-bold shadow-lg shadow-accent-cyan/20"
                                onClick={handleStart}
                                disabled={!taskName.trim()}
                            >
                                <Play className="w-5 h-5 mr-2 fill-current" /> Start Focus
                            </Button>

                            <p className="text-sm text-text-secondary">
                                💡 Tip: Start sessions from the extension popup
                            </p>
                        </>
                    )}

                </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4 mt-8">
                <Card>
                    <CardContent className="p-6">
                        <div className="text-sm text-text-secondary mb-2">Today's Focus</div>
                        <div className="text-2xl font-bold font-[family-name:var(--font-fira-code)]">
                            0h 0m
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="text-sm text-text-secondary mb-2">Sessions</div>
                        <div className="text-2xl font-bold font-[family-name:var(--font-fira-code)]">
                            0 completed
                        </div>
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}
