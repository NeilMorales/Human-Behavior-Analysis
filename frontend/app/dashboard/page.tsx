'use client';

import { useEffect, useState } from 'react';
import { getDashboardData, DashboardData } from '@/lib/api';
import { ScoreRing } from '@/components/dashboard/ScoreRing';
import { ActivityChart } from '@/components/charts/ActivityChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Target, Clock, Zap, AlertTriangle, Play } from 'lucide-react';
import { useActiveSession } from '@/hooks/useActiveSession';

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
        <div className="space-y-6">

            {/* Active Session Banner */}
            {activeSession && (
                <Card className="bg-gradient-to-r from-accent-cyan/10 to-accent-violet/10 border-accent-cyan/30">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-accent-cyan/20 flex items-center justify-center">
                                    <Play className="w-6 h-6 text-accent-cyan fill-current" />
                                </div>
                                <div>
                                    <div className="text-sm text-accent-cyan font-bold tracking-wider mb-1">
                                        ● FOCUS SESSION IN PROGRESS
                                    </div>
                                    <div className="text-xl font-semibold text-white">
                                        {activeSession.task_name}
                                    </div>
                                    <div className="text-sm text-text-secondary">
                                        {activeSession.category}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-black text-white font-[family-name:var(--font-fira-code)] tracking-tight">
                                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                                </div>
                                <div className="text-xs text-text-secondary mt-1">
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
                <Card className="flex flex-col items-center justify-center py-6">
                    <CardHeader className="text-center pb-0">
                        <CardTitle>Behavior Score</CardTitle>
                        <CardDescription>Based on your last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScoreRing score={data.score} level={data.level} color={data.scoreColor} />
                    </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    <StatCard
                        title="Focus Time Today"
                        value={`${Math.floor(data.cards.focusTimeToday / 60)}h ${data.cards.focusTimeToday % 60}m`}
                        icon={<Target className="text-accent-violet w-5 h-5" />}
                    />
                    <StatCard
                        title="Sessions Completed"
                        value={data.cards.sessionsToday}
                        icon={<Zap className="text-success w-5 h-5" />}
                    />
                    <StatCard
                        title="Completion Rate"
                        value={`${Math.round(data.cards.completionRate * 100)}%`}
                        icon={<ActivityChartIcon className="text-accent-cyan w-5 h-5" />}
                    />
                    <StatCard
                        title="Idle Time"
                        value={`${Math.floor(data.cards.idleTimeToday / 60)}m`}
                        icon={<Clock className="text-warning w-5 h-5" />}
                    />
                </div>
            </div>

            {/* Insights */}
            {data.insights && data.insights.length > 0 && (
                <Card className="bg-bg-tertiary border-accent-violet/20">
                    <CardContent className="p-4 flex items-start gap-3">
                        <AlertTriangle className="text-accent-violet mt-0.5 shrink-0" />
                        <div>
                            <h4 className="font-semibold text-white mb-1">AI Insights</h4>
                            <ul className="list-disc list-inside text-sm text-text-secondary space-y-1">
                                {data.insights.map((msg, i) => <li key={i}>{msg}</li>)}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Weekly Focus Time</CardTitle>
                        <CardDescription>Minutes spent in focus sessions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ActivityChart data={data.charts.weeklyFocusTime} dataKey="minutes" color="#7C3AED" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top Productive Domains</CardTitle>
                        <CardDescription>Where you spent your time today</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 mt-4">
                            {data.charts.topDomains.filter((d: any) => d.classification === 'productive').map((domain: any) => (
                                <div key={domain.domain} className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{domain.domain}</span>
                                    <span className="text-sm text-text-secondary font-[family-name:var(--font-fira-code)]">
                                        {Math.floor(domain.totalSeconds / 60)}m
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}

function StatCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
    return (
        <Card className="flex flex-col justify-center">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-secondary">{title}</span>
                    {icon}
                </div>
                <div className="text-3xl font-bold text-white font-[family-name:var(--font-fira-code)]">
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
