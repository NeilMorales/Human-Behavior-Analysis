import type { Classification } from './types';

export const DASHBOARD_URL = 'http://localhost:3000'; // Update before production

export const DEFAULT_CLASSIFICATIONS: Record<string, Classification> = {
    // Productive
    'github.com': 'productive',
    'gitlab.com': 'productive',
    'stackoverflow.com': 'productive',
    'notion.so': 'productive',
    'figma.com': 'productive',
    'leetcode.com': 'productive',
    'coursera.org': 'productive',
    'udemy.com': 'productive',
    'docs.google.com': 'productive',
    'linear.app': 'productive',
    'vercel.com': 'productive',
    'supabase.com': 'productive',
    'developer.mozilla.org': 'productive',
    'npmjs.com': 'productive',
    'typescriptlang.org': 'productive',
    'nextjs.org': 'productive',
    // Neutral
    'gmail.com': 'neutral',
    'calendar.google.com': 'neutral',
    'slack.com': 'neutral',
    'zoom.us': 'neutral',
    'meet.google.com': 'neutral',
    'wikipedia.org': 'neutral',
    'chat.openai.com': 'neutral',
    'google.com': 'neutral',
    'drive.google.com': 'neutral',
    // Distracting
    'youtube.com': 'distracting',
    'twitter.com': 'distracting',
    'x.com': 'distracting',
    'instagram.com': 'distracting',
    'reddit.com': 'distracting',
    'netflix.com': 'distracting',
    'twitch.tv': 'distracting',
    'tiktok.com': 'distracting',
    'facebook.com': 'distracting',
    '9gag.com': 'distracting',
};

export const IDLE_THRESHOLD_SECONDS = 120;
export const SYNC_INTERVAL_MINUTES = 5;
export const HEARTBEAT_INTERVAL_MINUTES = 1;
export const IDLE_REMINDER_MINUTES = 5;
export const MAX_SESSION_HOURS = 8;
export const LOCAL_DATA_RETENTION_DAYS = 30;
export const STORAGE_QUOTA_WARNING_BYTES = 8_000_000; // warn at 8MB of 10MB limit

export const ALARMS = {
    HEARTBEAT: 'heartbeat',
    SYNC: 'sync',
    IDLE_REMINDER: 'idle_reminder',
};
