import { useEffect, useState } from 'react';
import type { FocusSession } from '../../shared/types';

export function SessionTimer({ session }: { session: FocusSession }) {
    const [timeLeft, setTimeLeft] = useState('');
    const [stopping, setStopping] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            const remainingMs = (session.startTime + session.plannedDuration * 60000) - Date.now();
            if (remainingMs <= 0) {
                setTimeLeft('00:00');
                return;
            }
            const mins = Math.floor(remainingMs / 60000);
            const secs = Math.floor((remainingMs % 60000) / 1000);
            setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [session]);

    const handleStop = async (status: 'completed' | 'interrupted') => {
        setStopping(true);
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'STOP_SESSION',
                payload: { status }
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to stop session');
            }
        } catch (error) {
            console.error('Failed to stop session:', error);
            alert('Failed to stop session. Please try again.');
        } finally {
            setStopping(false);
        }
    };

    return (
        <div style={{ marginTop: '16px', borderTop: '1px solid #333', paddingTop: '16px', textAlign: 'center' }}>
            <div style={{ color: '#00D1FF', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '8px' }}>● IN PROGRESS</div>
            <div style={{ color: '#fff', fontSize: '14px', marginBottom: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                "{session.taskName} — {session.category}"
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '32px', color: '#fff', marginBottom: '16px' }}>
                {timeLeft}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={() => handleStop('interrupted')}
                    disabled={stopping}
                    style={{ 
                        flex: 1, 
                        padding: '8px', 
                        background: '#333', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: stopping ? 'not-allowed' : 'pointer',
                        opacity: stopping ? 0.5 : 1
                    }}
                >
                    {stopping ? '...' : '⏸ Pause'}
                </button>
                <button
                    onClick={() => handleStop('completed')}
                    disabled={stopping}
                    style={{ 
                        flex: 1, 
                        padding: '8px', 
                        background: '#FF4444', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: stopping ? 'not-allowed' : 'pointer', 
                        fontWeight: 'bold',
                        opacity: stopping ? 0.5 : 1
                    }}
                >
                    {stopping ? '...' : '■ Stop'}
                </button>
            </div>
        </div>
    );
}
