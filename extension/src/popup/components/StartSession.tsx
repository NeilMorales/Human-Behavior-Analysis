import { useState } from 'react';
import type { SessionCategory, SessionMode } from '../../shared/types';
import { DASHBOARD_URL } from '../../shared/constants';

// NOTE: Since sessionManager is a background module, we send a message to background 
// to start/stop sessions to avoid duplicating the alarm logic, or we implement it here 
// if we prefer, but messaging background is safer for alarm creation.

export function StartSession() {
    const [taskName, setTaskName] = useState('');
    const [category, setCategory] = useState<SessionCategory>('Coding');
    const [duration, setDuration] = useState(25);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleStart = async () => {
        if (!taskName.trim()) {
            setError('Please enter a task name');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'START_SESSION',
                payload: {
                    taskName: taskName.trim(),
                    category,
                    mode: 'free' as SessionMode,
                    plannedDuration: duration
                }
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to start session');
            }

            // Session started successfully - popup will auto-update via storage listener
            setTaskName('');
        } catch (e: any) {
            console.error('Failed to start session:', e);
            setError(e.message || 'Failed to start session');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ marginTop: '16px', borderTop: '1px solid #333', paddingTop: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#fff' }}>New Focus Session</h3>
            
            {error && (
                <div style={{ 
                    padding: '8px', 
                    marginBottom: '12px', 
                    background: '#FF4444', 
                    color: '#fff', 
                    borderRadius: '4px', 
                    fontSize: '12px' 
                }}>
                    {error}
                </div>
            )}
            
            <input
                type="text"
                placeholder="What are you working on?"
                value={taskName}
                onChange={e => setTaskName(e.target.value)}
                disabled={loading}
                style={{ 
                    width: '100%', 
                    padding: '8px', 
                    marginBottom: '8px', 
                    boxSizing: 'border-box', 
                    background: '#222', 
                    color: '#fff', 
                    border: '1px solid #444', 
                    borderRadius: '4px',
                    opacity: loading ? 0.5 : 1
                }}
            />
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <select
                    value={category}
                    onChange={e => setCategory(e.target.value as SessionCategory)}
                    disabled={loading}
                    style={{ 
                        flex: 1, 
                        padding: '4px', 
                        background: '#222', 
                        color: '#fff', 
                        border: '1px solid #444', 
                        borderRadius: '4px',
                        opacity: loading ? 0.5 : 1
                    }}
                >
                    <option value="Coding">Coding</option>
                    <option value="Study">Study</option>
                    <option value="Reading">Reading</option>
                    <option value="Writing">Writing</option>
                    <option value="Design">Design</option>
                    <option value="Project">Project</option>
                    <option value="Other">Other</option>
                </select>
                <input
                    type="number"
                    value={duration}
                    onChange={e => setDuration(Number(e.target.value))}
                    disabled={loading}
                    style={{ 
                        width: '60px', 
                        padding: '4px', 
                        background: '#222', 
                        color: '#fff', 
                        border: '1px solid #444', 
                        borderRadius: '4px',
                        opacity: loading ? 0.5 : 1
                    }}
                    min="1"
                    max="480"
                />
                <span style={{ color: '#aaa', alignSelf: 'center', fontSize: '12px' }}>min</span>
            </div>
            <button
                onClick={handleStart}
                disabled={loading || !taskName.trim()}
                style={{ 
                    width: '100%', 
                    padding: '8px', 
                    background: loading || !taskName.trim() ? '#555' : '#00D1FF', 
                    color: loading || !taskName.trim() ? '#999' : '#000', 
                    border: 'none', 
                    borderRadius: '4px', 
                    fontWeight: 'bold', 
                    cursor: loading || !taskName.trim() ? 'not-allowed' : 'pointer' 
                }}
            >
                {loading ? 'Starting...' : 'Start Focus Session'}
            </button>
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <a href={DASHBOARD_URL} target="_blank" rel="noreferrer" style={{ color: '#00D1FF', fontSize: '12px', textDecoration: 'none' }}>Open Full Dashboard ↗</a>
            </div>
        </div>
    );
}
