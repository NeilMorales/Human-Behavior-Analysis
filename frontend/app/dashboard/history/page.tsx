import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ActivityChart } from '@/components/charts/ActivityChart';

// Mock history data
const sessions = [
    { id: 1, task: 'Fix authentication bugs', duration: '45m', score: 88, status: 'completed', date: 'Today, 2:30 PM' },
    { id: 2, task: 'Read documentation', duration: '25m', score: 95, status: 'completed', date: 'Today, 11:00 AM' },
    { id: 3, task: 'Email replies', duration: '15m', score: 40, status: 'interrupted', date: 'Yesterday, 4:15 PM' },
];

export default function HistoryPage() {
    return (
        <div className="space-y-6">

            <Card>
                <CardHeader>
                    <CardTitle>Score History</CardTitle>
                    <CardDescription>Your behavior score over the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full bg-bg-tertiary rounded-lg border border-border flex items-center justify-center text-text-secondary">
                        [Chart Placeholder - Requires historical API data]
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Sessions</CardTitle>
                    <CardDescription>A log of your manual focus sessions</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 pt-2">
                        {sessions.map((s) => (
                            <div key={s.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-bg-tertiary border border-border">
                                <div className="mb-2 md:mb-0">
                                    <h4 className="font-semibold text-white">{s.task}</h4>
                                    <span className="text-sm text-text-secondary">{s.date}</span>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs text-text-secondary uppercase tracking-wide">Duration</span>
                                        <span className="font-bold font-[family-name:var(--font-fira-code)] text-white">{s.duration}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs text-text-secondary uppercase tracking-wide">Score</span>
                                        <span className={`font-bold font-[family-name:var(--font-fira-code)] ${s.score > 80 ? 'text-success' : s.score > 50 ? 'text-warning' : 'text-error'}`}>
                                            {s.score}
                                        </span>
                                    </div>
                                    <div className="w-24 text-right">
                                        <span className={`text-xs px-2 py-1 rounded border ${s.status === 'completed' ? 'border-success/20 text-success bg-success/10' : 'border-error/20 text-error bg-error/10'}`}>
                                            {s.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
