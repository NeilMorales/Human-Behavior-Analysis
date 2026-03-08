'use client';

import { useEffect, useState } from 'react';
import { getDashboardData, DashboardData } from '@/lib/api';
import { ScoreRing } from '@/components/dashboard/ScoreRing';
import { ActivityChart } from '@/components/charts/ActivityChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Target, Clock, Zap, AlertTriangle, Play } from 'lucide-react';
import { useActiveSession } from '@/hooks/useActiveSession';
import { CurrentWebsiteCard } from '@/components/dashboard/CurrentWebsiteCard';

export default function DashboardOverview() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const { session: activeSession } = useActiveSession();
    const [timeLeft, setTimeLeft] = useState(0);

    // Update timer every second for active session
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
            setTimeLeft(Math.floor(remaining / 1000));
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [activeSession]);

    useEffect(() => {
        async function load() {
            try {
                const res = await getDashboardData();
                setData(res);
            } catch (e) {
                console.error("Failed to load dashboard data", e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading || !data) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-8 h-8 border-4 border-accent-cyan border-t-transparent rounded-full" />
            </div>
        );
    }

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <div className="space-y-8">

            {/* Welcome Header */}
            <div className="text-center space-y-3 mb-6">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    Welcome back! 👋
                </h1>
                <p className="text-text-secondary text-lg">
                    Your productivity score is {data.score >= 80 ? 'excellent' : data.score >= 60 ? 'good' : 'improving'} 📈
                </p>
            </div>

            {/* Active Session Banner */}
            {activeSession && (
                <Card className="glass-card border-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 shadow-2xl">
                    <CardContent className="p-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg glow-blue">
                                    <Play className="w-8 h-8 text-white fill-current" />
                                </div>
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-400 pulse-glow"></div>
                                        <span className="text-blue-300 text-xs font-bold tracking-wider uppercase">
                                            Focus Session Active
                                        </span>
                                    </div>
                                    <div className="text-2xl font-bold text-white mb-1">
                                        {activeSession.task_name}
                                    </div>
                                    <div className="text-sm text-text-secondary">
                                        {activeSession.category}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-5xl font-black text-white font-[family-name:var(--font-fira-code)] tracking-tight" style={{ textShadow: '0 0 20px rgba(59, 130, 246, 0.5)' }}>
                                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                                </div>
                                <div className="text-sm text-text-secondary mt-2 font-medium">
                                    Time Remaining
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Top Main Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Score Card */}
                <Card className="glass-card border-0 flex flex-col items-center justify-center py-8 hover:scale-105 transition-transform duration-300">
                    <CardHeader className="text-center pb-0">
                        <CardTitle className="text-xl font-bold">Behavior Score</CardTitle>
                        <CardDescription>Based on your last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScoreRing score={data.score} level={data.level} color={data.scoreColor} />
                    </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    <StatCard
                        title="🔥 Focus Time"
                        value={`${Math.floor(data.cards.focusTimeToday / 60)}h ${data.cards.focusTimeToday % 60}m`}
                        icon={<Target className="text-purple-400 w-5 h-5" />}
                        gradient="from-purple-500/20 to-pink-500/20"
                    />
                    <StatCard
                        title="⏱️ Sessions"
                        value={data.cards.sessionsToday}
                        icon={<Zap className="text-green-400 w-5 h-5" />}
                        gradient="from-green-500/20 to-emerald-500/20"
                    />
                    <StatCard
                        title="✅ Completion"
                        value={`${Math.round(data.cards.completionRate * 100)}%`}
                        icon={<ActivityChartIcon className="text-cyan-400 w-5 h-5" />}
                        gradient="from-cyan-500/20 to-blue-500/20"
                    />
                    <StatCard
                        title="💎 Score"
                        value={data.score}
                        icon={<Clock className="text-amber-400 w-5 h-5" />}
                        gradient="from-amber-500/20 to-orange-500/20"
                    />
                </div>
            </div>

            {/* Insights */}
            {data.insights && data.insights.length > 0 && (
                <Card className="glass-card border-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                    <CardContent className="p-6 flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shrink-0 shadow-lg">
                            <AlertTriangle className="text-white w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-white mb-3 text-lg">✨ AI Insights</h4>
                            <ul className="space-y-2">
                                {data.insights.map((msg, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                                        <span className="text-purple-400 mt-0.5">•</span>
                                        <span>{msg}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-card border-0">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold">📊 Weekly Focus Time</CardTitle>
                        <CardDescription>Minutes spent in deep work</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ActivityChart data={data.charts.weeklyFocusTime} dataKey="minutes" color="#8B5CF6" />
                    </CardContent>
                </Card>

                {/* Website Activity Card - shows real-time tracking during active session */}
                <div className="glass-card border-0 rounded-2xl overflow-hidden">
                    <CurrentWebsiteCard sessionId={activeSession?.session_id} />
                </div>
            </div>

            {/* Top Domains Card */}
            <Card className="glass-card border-0">
                <CardHeader>
                    <CardTitle className="text-xl font-bold">🌐 Top Productive Domains</CardTitle>
                    <CardDescription>Where you spent your time productively today</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {data.charts.topDomains.filter((d: any) => d.classification === 'productive').slice(0, 6).map((domain: any) => (
                            <div key={domain.domain} className="p-5 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:scale-105">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-green-400/20 flex items-center justify-center text-lg">
                                        🌐
                                    </div>
                                    <span className="text-sm font-semibold text-white truncate flex-1">{domain.domain}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-text-secondary font-medium">Time spent</span>
                                    <span className="text-base text-green-400 font-mono font-bold">
                                        {Math.floor(domain.totalSeconds / 60)}m
                                    </span>
                                </div>
                            </div>
                        ))}
                        {data.charts.topDomains.filter((d: any) => d.classification === 'productive').length === 0 && (
                            <div className="col-span-full text-center py-12 text-text-secondary">
                                <div className="text-4xl mb-3">📊</div>
                                <p className="font-medium">No productive domains tracked yet</p>
                                <p className="text-sm mt-2">Start a session and visit productive websites</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}

function StatCard({ title, value, icon, gradient }: { title: string, value: string | number, icon: React.ReactNode, gradient: string }) {
    return (
        <Card className={`glass-card border-0 bg-gradient-to-br ${gradient} hover:scale-105 transition-transform duration-300`}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-text-secondary">{title}</span>
                    {icon}
                </div>
                <div className="text-3xl font-black text-white font-[family-name:var(--font-fira-code)]">
                    {value}
                </div>
            </CardContent>
        </Card>
    )
}

function ActivityChartIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    )
}
