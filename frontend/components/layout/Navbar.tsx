'use client';

import { usePathname } from 'next/navigation';

export function Navbar() {
    const pathname = usePathname();

    // Simple title mapper
    const getTitle = () => {
        switch (pathname) {
            case '/dashboard': return 'Overview';
            case '/dashboard/focus': return 'Focus Mode';
            case '/dashboard/history': return 'History & Patterns';
            case '/dashboard/settings': return 'Settings';
            default: return 'Dashboard';
        }
    }

    return (
        <header className="h-16 flex items-center justify-between px-8 bg-bg-primary border-b border-border sticky top-0 z-10">
            <h1 className="text-xl font-semibold text-white">
                {getTitle()}
            </h1>
            <div className="flex items-center gap-4">
                {/* User avatar or other header items can go here */}
                <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-sm font-medium text-text-secondary border border-border">
                    U
                </div>
            </div>
        </header>
    );
}
