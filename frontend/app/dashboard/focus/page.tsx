'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Square } from 'lucide-react';
import { useActiveSession } from '@/hooks/useActiveSession';
import { CurrentWebsiteCard } from '@/components/dashboard/CurrentWebsiteCard';

const CATEGORIES = ['Study', 'Coding', 'Reading', 'Project', 'Writing', 'Design', 'Other'];

export default function FocusModePage() {
    const { session: activeSession, loading, error } = useActiveSession();
    const [taskName, setTaskName] = useState('');
    const [category, setCategory] = useState('Coding');
    const [duration, setDuration] = useState(25);
    const [timeLeft, setTimeLeft] = useState(0);
    const [todayFocus, setTodayFocus] = useState(0); // in minutes
    const [totalSessions, setTotalSessions] = useState(0);

    // Fetch today's focus time and total sessions
    useEffect(() => {
        async function fetchStats() {
            try {
                const response = await fetch('/api/sessions');
                if (response.ok) {
                    const data = await response.json();
                    const sessions = data.sessions || [];
                    
                    // Calculate today's focus time
                    const today = new Date().toDateString();
                    const todaySessions = sessions.filter((s: any) => {
                        const sessionDate = new Date(s.start_time).toDateString();
                        return sessionDate === today && s.status === 'completed';
                    });
                    const todayMinutes = todaySessions.reduce((sum: number, s: any) => sum + (s.actual_duration || 0), 0);
                    setTodayFocus(todayMinutes);
                    
                    // Count total completed sessions
                    const completed = sessions.filter((s: any) => s.status === 'completed').length;
                    setTotalSessions(completed);
                }
            } catch (err) {
                console.error('Failed to fetch stats:', err);
            }
        }
        fetchStats();
    }, [activeSession]); // Refresh when session changes

    // Update timer every second and auto-stop when complete
    useEffect(() => {
        if (!activeSession) {
            setTimeLeft(0);
            return;
        }

        let hasAutoStopped = false;

        const updateTimer = async () => {
            const now = Date.now();
            const startTime = new Date(activeSession.start_time).getTime();
            const plannedEndTime = startTime + (activeSession.planned_duration * 60 * 1000);
            const remaining = Math.max(0, plannedEndTime - now);
            const remainingSeconds = Math.floor(remaining / 1000);
            setTimeLeft(remainingSeconds);

            // Auto-stop when timer reaches 0 (only once)
            if (remainingSeconds === 0 && !hasAutoStopped) {
                hasAutoStopped = true;
                try {
                    // Stop via API
                    const response = await fetch(`/api/sessions/${activeSession.session_id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            status: 'completed',
                            endTime: Date.now(),
                            actualDuration: Math.floor((Date.now() - new Date(activeSession.start_time).getTime()) / 60000),
                        }),
                    });

                    if (response.ok) {
                        // Refresh page to update UI
                        window.location.reload();
                    }
                } catch (err) {
                    console.error('Failed to auto-stop session:', err);
                }
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [activeSession]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    const totalSeconds = activeSession ? activeSession.planned_duration * 60 : 0;
    const elapsedSeconds = totalSeconds - timeLeft;
    const progressPercent = totalSeconds > 0 ? (elapsedSeconds / totalSeconds) * 100 : 0;

    const handleStart = async () => {
        if (!taskName.trim()) {
            alert('Please enter a task name');
            return;
        }
        
        try {
            const sessionId = crypto.randomUUID();
            const startTime = Date.now();
            
            const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: sessionId,
                    taskName: taskName,
                    category: category,
                    mode: 'free', // Valid mode: 'free' or 'pomodoro'
                    plannedDuration: duration,
                    startTime: startTime,
                    status: 'in_progress',
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to start session');
            }
            
            window.location.reload();
        } catch (e: any) {
            console.error(e);
            alert(e.message || 'Failed to start session. Please try again.');
        }
    };

    const handleStop = async () => {
        if (!activeSession) return;
        
        try {
            // First, try to send message to extension to stop the session (only in browser)
            if (typeof window !== 'undefined' && typeof (window as any).chrome !== 'undefined' && (window as any).chrome.runtime) {
                try {
                    (window as any).chrome.runtime.sendMessage(
                        { type: 'STOP_SESSION', sessionId: activeSession.session_id },
                        (response: any) => {
                            if ((window as any).chrome.runtime.lastError) {
                                console.log('Extension not available, stopping via API only');
                            }
                        }
                    );
                } catch (err) {
                    console.log('Could not communicate with extension:', err);
                }
            }

            // Also stop via API (for dashboard-only users or as backup)
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
            alert('Failed to stop session. Please stop from extension popup.');
        }
    };

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto space-y-6 pt-10">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-accent-cyan border-t-transparent rounded-full mx-auto" />
                    <p className="mt-4 text-text-secondary">Loading session...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto space-y-6 pt-10">
                <Card className="border-red-500/20">
                    <CardContent className="p-6 text-center">
                        <p className="text-red-500">Error loading session: {error}</p>
                        <p className="text-sm text-text-secondary mt-2">Make sure you're logged in</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 pt-8 pb-12">

            <div className="text-center space-y-3 mb-8">
                <h1 className="text-4xl font-bold text-white tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    Focus Session
                </h1>
                <p className="text-text-secondary text-lg">
                    {activeSession ? '✨ Deep work in progress' : 'Enter your flow state and maximize productivity'}
                </p>
            </div>

            <Card className="glass-card border-0 shadow-2xl">
                <CardContent className="p-12 flex flex-col items-center justify-center space-y-10">

                    {activeSession ? (
                        <>
                            <div className="text-center space-y-4 w-full">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 pulse-glow"></div>
                                    <span className="text-blue-300 text-sm font-bold tracking-wider uppercase">
                                        In Progress
                                    </span>
                                </div>
                                <div className="text-2xl text-white font-bold">
                                    {activeSession.task_name}
                                </div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                                    <span className="text-purple-300 text-sm font-medium">
                                        {activeSession.category}
                                    </span>
                                </div>
                            </div>

                            {/* Premium Circular Progress Ring with Glow */}
                            <div className="relative w-80 h-80">
                                <svg className="w-full h-full transform -rotate-90 filter drop-shadow-2xl">
                                    {/* Outer glow ring */}
                                    <circle
                                        cx="160"
                                        cy="160"
                                        r="140"
                                        stroke="url(#gradient-glow)"
                                        strokeWidth="2"
                                        fill="none"
                                        opacity="0.3"
                                    />
                                    {/* Background circle */}
                                    <circle
                                        cx="160"
                                        cy="160"
                                        r="130"
                                        stroke="currentColor"
                                        strokeWidth="16"
                                        fill="none"
                                        className="text-bg-elevated"
                                    />
                                    {/* Progress circle with gradient */}
                                    <circle
                                        cx="160"
                                        cy="160"
                                        r="130"
                                        stroke="url(#gradient)"
                                        strokeWidth="16"
                                        fill="none"
                                        strokeDasharray={`${2 * Math.PI * 130}`}
                                        strokeDashoffset={`${2 * Math.PI * 130 * (1 - progressPercent / 100)}`}
                                        className="transition-all duration-1000 ease-out"
                                        strokeLinecap="round"
                                        style={{ filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.8))' }}
                                    />
                                    {/* Gradient definitions */}
                                    <defs>
                                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#3B82F6" />
                                            <stop offset="50%" stopColor="#8B5CF6" />
                                            <stop offset="100%" stopColor="#06B6D4" />
                                        </linearGradient>
                                        <linearGradient id="gradient-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#3B82F6" />
                                            <stop offset="100%" stopColor="#8B5CF6" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                {/* Timer in center with enhanced styling */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <div className="text-7xl font-black text-white font-[family-name:var(--font-fira-code)] tracking-tighter" style={{ textShadow: '0 0 30px rgba(59, 130, 246, 0.5)' }}>
                                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                                    </div>
                                    <div className="text-sm text-text-secondary mt-3 font-medium">
                                        {Math.round(progressPercent)}% complete
                                    </div>
                                </div>
                            </div>

                            <Button
                                variant="danger"
                                size="lg"
                                className="w-48 rounded-full h-16 text-lg font-bold shadow-2xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all duration-300 hover:scale-105"
                                onClick={handleStop}
                            >
                                <Square className="w-5 h-5 mr-2 fill-current" /> Stop Session
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="w-full max-w-md space-y-6">
                                <input
                                    type="text"
                                    placeholder="What are you working on?"
                                    value={taskName}
                                    onChange={(e) => setTaskName(e.target.value)}
                                    required
                                    className="w-full bg-bg-elevated/50 border-2 border-border-light rounded-2xl px-6 py-4 text-white text-center text-lg focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 placeholder:text-text-muted"
                                />
                                
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    required
                                    className="w-full bg-bg-elevated/50 border-2 border-border-light rounded-2xl px-6 py-4 text-white text-center text-lg focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat} className="bg-bg-tertiary">{cat}</option>
                                    ))}
                                </select>

                                <div className="flex items-center justify-center gap-4">
                                    <label className="text-text-secondary font-medium">Duration:</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="480"
                                        value={duration}
                                        onChange={(e) => setDuration(parseInt(e.target.value) || 25)}
                                        className="w-24 bg-bg-elevated/50 border-2 border-border-light rounded-xl px-4 py-2 text-white text-center text-lg focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 font-[family-name:var(--font-fira-code)]"
                                    />
                                    <span className="text-text-secondary">minutes</span>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="text-8xl font-black text-white/30 font-[family-name:var(--font-fira-code)] tracking-tighter">
                                    {String(duration).padStart(2, '0')}:00
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-8xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent font-[family-name:var(--font-fira-code)] tracking-tighter opacity-50">
                                        {String(duration).padStart(2, '0')}:00
                                    </div>
                                </div>
                            </div>

                            <Button
                                size="lg"
                                className="gradient-button w-52 rounded-full h-16 text-lg font-bold border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleStart}
                                disabled={!taskName.trim()}
                            >
                                <Play className="w-6 h-6 mr-2 fill-current" /> Start Focus
                            </Button>

                            <div className="flex items-center gap-2 text-sm text-text-secondary bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20">
                                <span className="text-blue-400">💡</span>
                                <span>You can also start sessions from the extension popup</span>
                            </div>
                        </>
                    )}

                </CardContent>
            </Card>

            {/* Website Activity during active session */}
            {activeSession && (
                <div className="glass-card border-0 rounded-2xl overflow-hidden">
                    <CurrentWebsiteCard sessionId={activeSession.session_id} />
                </div>
            )}

            <div className="grid grid-cols-2 gap-6">
                <Card className="glass-card border-0 hover:scale-105 transition-transform duration-300">
                    <CardContent className="p-8">
                        <div className="text-sm text-text-secondary mb-3 font-medium">Today's Focus</div>
                        <div className="text-3xl font-black font-[family-name:var(--font-fira-code)] bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                            {Math.floor(todayFocus / 60)}h {todayFocus % 60}m
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card border-0 hover:scale-105 transition-transform duration-300">
                    <CardContent className="p-8">
                        <div className="text-sm text-text-secondary mb-3 font-medium">Sessions</div>
                        <div className="text-3xl font-black font-[family-name:var(--font-fira-code)] bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            {totalSessions} completed
                        </div>
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}
