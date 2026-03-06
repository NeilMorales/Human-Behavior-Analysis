'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Target, Activity, Settings, LogOut, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const routes = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/focus', label: 'Focus Mode', icon: Target },
    { href: '/dashboard/history', label: 'History & Patterns', icon: Activity },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (e) {
            console.error(e);
            setLoggingOut(false);
        }
    };

    return (
        <aside className="fixed inset-y-0 left-0 w-64 bg-bg-secondary border-r border-border flex flex-col z-10">
            <div className="h-16 flex items-center px-6 border-b border-border">
                <div className="flex items-center gap-2 text-accent-cyan font-bold text-xl tracking-tight">
                    <div className="w-6 h-6 rounded-md bg-accent-cyan flex items-center justify-center">
                        <span className="text-bg-primary text-sm font-black">B</span>
                    </div>
                    BehaviorIQ
                </div>
            </div>

            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                {routes.map((route) => {
                    const isActive = pathname === route.href;
                    const Icon = route.icon;
                    return (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                                isActive
                                    ? "bg-bg-tertiary text-accent-cyan"
                                    : "text-text-secondary hover:bg-bg-tertiary/50 hover:text-text-primary"
                            )}
                        >
                            <Icon className={cn("w-5 h-5", isActive ? "text-accent-cyan" : "text-text-secondary group-hover:text-text-primary")} />
                            {route.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border mt-auto">
                <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex w-full items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                >
                    {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    Logout
                </button>
            </div>
        </aside>
    );
}
