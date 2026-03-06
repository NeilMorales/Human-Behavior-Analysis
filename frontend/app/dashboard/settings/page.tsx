'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
    return (
        <div className="max-w-3xl space-y-6">

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
                            <input type="number" defaultValue={120} className="w-20 bg-bg-tertiary border border-border rounded-md px-3 py-2 text-white font-[family-name:var(--font-fira-code)] focus:border-accent-cyan outline-none" />
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
                            <input type="number" defaultValue={2} className="w-20 bg-bg-tertiary border border-border rounded-md px-3 py-2 text-white font-[family-name:var(--font-fira-code)] focus:border-accent-cyan outline-none" />
                            <span className="text-text-secondary text-sm">minutes</span>
                        </div>
                    </div>

                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Domain Classifications</CardTitle>
                    <CardDescription>Override default site categorizations</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-4 rounded-lg bg-bg-tertiary border border-dashed border-border text-center text-text-secondary">
                        Custom classifications table will go here.
                        <br />
                        <Button variant="outline" size="sm" className="mt-4">Add Custom Domain</Button>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
                <Button size="lg">Save Changes</Button>
            </div>

        </div>
    );
}
