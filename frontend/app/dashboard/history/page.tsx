'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ActivityChart } from '@/components/charts/ActivityChart';

interface Session {
    session_id: string;
    task_name: string;
    category: string;
    start_time: string;
    end_time: string | null;
    actual_duration: number | null;
    status: string;
    focus_score: number | null;
    self_rating: number | null;
}

interface WebsiteVisit {
    domain: string;
    classification: string;
    duration_seconds: number;
    start_time: string;
}

interface SessionWithVisits extends Session {
    websiteVisits?: WebsiteVisit[];
    expanded?: boolean;
}

export default function HistoryPage() {
    const [sessions, setSessions] = useState<SessionWithVisits[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchSessions() {
            try {
                const response = await fetch('/api/sessions');
                if (!response.ok) throw new Error('Failed to fetch sessions');
                
                const data = await response.json();
                const sessionsWithExpanded = (data.sessions || []).map((s: Session) => ({
                    ...s,
                    expanded: false,
                    websiteVisits: []
                }));
                setSessions(sessionsWithExpanded);
            } catch (err: any) {
                console.error('Error fetching sessions:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchSessions();
    }, []);

    const toggleSessionExpand = async (sessionId: string) => {
        const session = sessions.find(s => s.session_id === sessionId);
        if (!session) return;

        // If already expanded, just collapse
        if (session.expanded) {
            setSessions(sessions.map(s => 
                s.session_id === sessionId ? { ...s, expanded: false } : s
            ));
            return;
        }

        // If not expanded and no visits loaded, fetch them
        if (!session.websiteVisits || session.websiteVisits.length === 0) {
            try {
                const response = await fetch(`/api/sessions/${sessionId}/visits`);
                if (response.ok) {
                    const data = await response.json();
                    setSessions(sessions.map(s => 
                        s.session_id === sessionId 
                            ? { ...s, expanded: true, websiteVisits: data.visits || [] }
                            : s
                    ));
                } else {
                    // No visits found, just expand with empty array
                    setSessions(sessions.map(s => 
                        s.session_id === sessionId ? { ...s, expanded: true } : s
                    ));
                }
            } catch (err) {
                console.error('Error fetching visits:', err);
                setSessions(sessions.map(s => 
                    s.session_id === sessionId ? { ...s, expanded: true } : s
                ));
            }
        } else {
            // Already have visits, just expand
            setSessions(sessions.map(s => 
                s.session_id === sessionId ? { ...s, expanded: true } : s
            ));
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        } else if (diffDays === 1) {
            return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        }
    };

    const formatDuration = (minutes: number | null) => {
        if (!minutes) return '0m';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const formatSeconds = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    };

    const getClassificationColor = (classification: string) => {
        switch (classification) {
            case 'productive': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'neutral': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'distracting': return 'text-red-400 bg-red-400/10 border-red-400/20';
            default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-accent-cyan border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error) {
        return (
            <Card className="border-red-500/20">
                <CardContent className="p-6 text-center">
                    <p className="text-red-500">Error: {error}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8">

            <div className="text-center space-y-3 mb-6">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    Session History 📚
                </h1>
                <p className="text-text-secondary text-lg">
                    Track your progress and review past focus sessions
                </p>
            </div>

            <Card className="glass-card border-0">
                <CardHeader>
                    <CardTitle className="text-xl font-bold">📈 Score History</CardTitle>
                    <CardDescription>Your behavior score over the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-xl border border-border-light flex items-center justify-center text-text-secondary">
                        [Chart Placeholder - Requires historical API data]
                    </div>
                </CardContent>
            </Card>

            <Card className="glass-card border-0">
                <CardHeader>
                    <CardTitle className="text-xl font-bold">🎯 Recent Sessions</CardTitle>
                    <CardDescription>
                        {sessions.length > 0 
                            ? `${sessions.length} focus session${sessions.length !== 1 ? 's' : ''} recorded`
                            : 'No sessions yet - start one from the extension!'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {sessions.length === 0 ? (
                        <div className="text-center py-16 text-text-secondary">
                            <div className="text-6xl mb-4">🎯</div>
                            <p className="text-lg font-medium">No focus sessions yet</p>
                            <p className="text-sm mt-2">Start a session from the extension popup to see it here!</p>
                        </div>
                    ) : (
                        <div className="space-y-4 pt-2">
                            {sessions.map((s) => (
                                <div key={s.session_id} className="rounded-2xl bg-gradient-to-br from-bg-elevated/50 to-bg-tertiary/50 border border-border-light overflow-hidden hover:border-blue-500/30 transition-all duration-300">
                                    <div 
                                        className="flex flex-col md:flex-row md:items-center justify-between p-6 cursor-pointer hover:bg-bg-elevated/30 transition-colors"
                                        onClick={() => toggleSessionExpand(s.session_id)}
                                    >
                                        <div className="mb-3 md:mb-0">
                                            <h4 className="font-bold text-white text-lg mb-2">{s.task_name}</h4>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-text-secondary">{formatDate(s.start_time)}</span>
                                                <span className="text-text-muted">•</span>
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                                                    <span className="text-xs text-purple-300 font-medium">{s.category}</span>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold mb-1">Duration</span>
                                                <span className="font-black font-[family-name:var(--font-fira-code)] text-white text-lg">
                                                    {formatDuration(s.actual_duration)}
                                                </span>
                                            </div>
                                            {s.focus_score !== null && (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold mb-1">Score</span>
                                                    <span className={`font-black font-[family-name:var(--font-fira-code)] text-lg ${
                                                        s.focus_score > 80 ? 'text-green-400' : 
                                                        s.focus_score > 50 ? 'text-amber-400' : 
                                                        'text-red-400'
                                                    }`}>
                                                        {Math.round(s.focus_score)}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="w-32 text-right">
                                                <span className={`text-xs px-3 py-1.5 rounded-full border font-semibold ${
                                                    s.status === 'completed' ? 'border-green-500/30 text-green-400 bg-green-500/10' : 
                                                    s.status === 'in_progress' ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10' :
                                                    'border-red-500/30 text-red-400 bg-red-500/10'
                                                }`}>
                                                    {s.status}
                                                </span>
                                            </div>
                                            <div className="text-text-secondary">
                                                <svg 
                                                    className={`w-6 h-6 transition-transform duration-300 ${s.expanded ? 'rotate-180' : ''}`} 
                                                    fill="none" 
                                                    stroke="currentColor" 
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded section with website visits */}
                                    {s.expanded && (
                                        <div className="border-t border-border-light p-6 bg-bg-primary/30">
                                            <h5 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                                <span>🌐</span>
                                                <span>Websites Visited</span>
                                            </h5>
                                            {s.websiteVisits && s.websiteVisits.length > 0 ? (
                                                <div className="space-y-3">
                                                    {s.websiteVisits.map((visit, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-bg-elevated/80 to-bg-tertiary/80 border border-border-light hover:border-blue-500/30 transition-all duration-300">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-base">
                                                                    🌐
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-semibold text-white">{visit.domain}</p>
                                                                    <p className="text-xs text-text-secondary mt-0.5">
                                                                        {new Date(visit.start_time).toLocaleTimeString('en-US', { 
                                                                            hour: 'numeric', 
                                                                            minute: '2-digit' 
                                                                        })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-sm font-mono font-bold text-white">
                                                                    {formatSeconds(visit.duration_seconds)}
                                                                </span>
                                                                <span className={`text-xs px-3 py-1.5 rounded-full border capitalize font-semibold ${getClassificationColor(visit.classification)}`}>
                                                                    {visit.classification}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-text-secondary bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-xl border border-border-light">
                                                    <div className="text-3xl mb-2">📊</div>
                                                    <p className="text-sm font-medium">No website tracking data for this session</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}
