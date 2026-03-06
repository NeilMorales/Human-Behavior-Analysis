import { useEffect, useState } from 'react';
import { readStorage } from '../shared/storage';
import type { StorageSchema, DailySummary, FocusSession } from '../shared/types';
import { ScoreRing } from './components/ScoreRing';
import { SessionTimer } from './components/SessionTimer';
import { StartSession } from './components/StartSession';
import { LoginForm } from './components/LoginForm';

export default function PopupApp() {
    const [storage, setStorage] = useState<Partial<StorageSchema>>({});
    const [currentSite, setCurrentSite] = useState<{ domain: string, classType: string }>({ domain: '', classType: 'neutral' });
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initial Fetch
        readStorage(['activeSession', 'todaySummary', 'user', 'accessToken']).then(data => {
            setStorage(data);
            setIsAuthenticated(!!data.accessToken && !!data.user);
            setLoading(false);
        });

        // Listen for storage changes (active session state, score updates)
        const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
            if (areaName === 'local') {
                setStorage(prev => {
                    const newState = { ...prev };
                    if (changes.activeSession) newState.activeSession = changes.activeSession.newValue as FocusSession | null;
                    if (changes.todaySummary) newState.todaySummary = changes.todaySummary.newValue as DailySummary | null;
                    if (changes.user) newState.user = changes.user.newValue;
                    if (changes.accessToken) {
                        newState.accessToken = changes.accessToken.newValue;
                        setIsAuthenticated(!!changes.accessToken.newValue && !!newState.user);
                    }
                    return newState;
                });
            }
        };
        chrome.storage.onChanged.addListener(listener);

        // Get current site
        chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
            if (tabs[0]?.url) {
                try {
                    const url = new URL(tabs[0].url);
                    const domain = url.hostname.replace('www.', '');
                    if (!domain.startsWith('chrome') && !domain.startsWith('extension')) {
                        setCurrentSite({ domain, classType: 'neutral' }); // Ideal: fetch classification from background or settings
                    }
                } catch {
                    // Ignore invalid url
                }
            }
        });

        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    const handleLoginSuccess = () => {
        readStorage(['user', 'accessToken', 'todaySummary']).then(data => {
            setStorage(prev => ({ ...prev, ...data }));
            setIsAuthenticated(true);
        });
    };

    if (loading) {
        return (
            <div style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                background: '#111',
                color: '#eee',
                padding: '16px',
                width: '320px',
                boxSizing: 'border-box',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '200px',
            }}>
                <div style={{ color: '#00D1FF' }}>Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                background: '#111',
                color: '#eee',
                width: '320px',
                boxSizing: 'border-box',
            }}>
                <LoginForm onLoginSuccess={handleLoginSuccess} />
            </div>
        );
    }

    const summary: DailySummary = storage.todaySummary || {
        userId: '', date: '', totalFocusTime: 0, sessionsCount: 0, completionRate: 0,
        idleTime: 0, productiveTime: 0, distractingTime: 0, neutralTime: 0, behaviorScore: 0, rolling7dScore: 0
    };

    return (
        <div style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            background: '#111',
            color: '#eee',
            padding: '16px',
            width: '320px',
            boxSizing: 'border-box'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '16px', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#00D1FF' }}>[BQ]</span> BehaviorIQ
                </h1>
                <a href={chrome.runtime.getURL("src/options/index.html")} target="_blank" rel="noreferrer" style={{ color: '#aaa', textDecoration: 'none', fontSize: '16px' }}>⚙</a>
            </div>

            <div style={{ textAlign: 'center', color: '#999', fontSize: '12px' }}>Today's Score</div>

            <ScoreRing score={summary.behaviorScore || 0} />

            <div style={{ background: '#222', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#aaa' }}>⏱ Productive</span>
                    <span style={{ fontWeight: 'bold' }}>{Math.floor((summary.productiveTime || 0) / 60)}h {(summary.productiveTime || 0) % 60}m</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#aaa' }}>⚡ Distracting</span>
                    <span style={{ fontWeight: 'bold' }}>{(summary.distractingTime || 0)}m</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#aaa' }}>🎯 Sessions</span>
                    <span style={{ fontWeight: 'bold' }}>{summary.sessionsCount || 0}</span>
                </div>
            </div>

            {currentSite.domain && (
                <div style={{ fontSize: '12px', color: '#aaa', paddingBottom: '12px' }}>
                    Now: <span style={{ color: '#fff' }}>{currentSite.domain}</span>
                </div>
            )}

            {storage.activeSession ? (
                <SessionTimer session={storage.activeSession} />
            ) : (
                <StartSession />
            )}
        </div>
    );
}
