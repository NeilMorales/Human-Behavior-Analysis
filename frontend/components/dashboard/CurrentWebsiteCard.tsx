'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe } from 'lucide-react';

interface WebsiteVisit {
    domain: string;
    classification: string;
    duration_seconds: number;
    start_time: string;
}

export function CurrentWebsiteCard({ sessionId }: { sessionId?: string }) {
    const [visits, setVisits] = useState<WebsiteVisit[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!sessionId) {
            setVisits([]);
            return;
        }

        const fetchVisits = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/sessions/${sessionId}/visits`);
                if (response.ok) {
                    const data = await response.json();
                    setVisits(data.visits || []);
                }
            } catch (err) {
                console.error('Error fetching visits:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchVisits();
        
        // Refresh every 10 seconds during active session
        const interval = setInterval(fetchVisits, 10000);
        return () => clearInterval(interval);
    }, [sessionId]);

    const getClassificationColor = (classification: string) => {
        switch (classification) {
            case 'productive': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'neutral': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'distracting': return 'text-red-400 bg-red-400/10 border-red-400/20';
            default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
        }
    };

    const formatSeconds = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    };

    if (!sessionId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        Website Activity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-text-secondary">
                        <p>No active session</p>
                        <p className="text-sm mt-2">Start a session to track website activity</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (loading && visits.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        Website Activity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin w-6 h-6 border-4 border-accent-cyan border-t-transparent rounded-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    const currentVisit = visits.length > 0 ? visits[visits.length - 1] : null;
    const totalTime = visits.reduce((sum, v) => sum + v.duration_seconds, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Website Activity
                </CardTitle>
            </CardHeader>
            <CardContent>
                {visits.length === 0 ? (
                    <div className="text-center py-8 text-text-secondary">
                        <p>No websites visited yet</p>
                        <p className="text-sm mt-2">Browse the web during your session</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Current Website */}
                        {currentVisit && (
                            <div className="p-4 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-accent-cyan font-semibold uppercase tracking-wider">
                                        Current
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded border capitalize ${getClassificationColor(currentVisit.classification)}`}>
                                        {currentVisit.classification}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center text-lg">
                                        🌐
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-white">{currentVisit.domain}</p>
                                        <p className="text-sm text-text-secondary">
                                            {formatSeconds(currentVisit.duration_seconds)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Summary */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg bg-bg-tertiary border border-border">
                                <p className="text-xs text-text-secondary mb-1">Total Sites</p>
                                <p className="text-2xl font-bold text-white">{visits.length}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-bg-tertiary border border-border">
                                <p className="text-xs text-text-secondary mb-1">Total Time</p>
                                <p className="text-2xl font-bold text-white">{formatSeconds(totalTime)}</p>
                            </div>
                        </div>

                        {/* Recent Visits */}
                        {visits.length > 1 && (
                            <div>
                                <p className="text-xs text-text-secondary uppercase tracking-wider mb-2">Recent</p>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {visits.slice(0, -1).reverse().slice(0, 5).map((visit, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-bg-tertiary">
                                            <span className="text-sm text-white truncate flex-1">{visit.domain}</span>
                                            <span className="text-xs text-text-secondary ml-2">
                                                {formatSeconds(visit.duration_seconds)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
