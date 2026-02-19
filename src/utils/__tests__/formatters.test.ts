/**
 * Tests for shared formatting utilities.
 */

import { formatRelativeTime, formatSyncStatus, formatDuration, formatDistance, pluralise, formatTime } from '../formatters';

describe('formatRelativeTime', () => {
    it('returns "Never" for null', () => {
        expect(formatRelativeTime(null)).toBe('Never');
    });

    it('returns "Just now" for a date less than 1 minute ago', () => {
        const date = new Date(Date.now() - 30_000); // 30 seconds ago
        expect(formatRelativeTime(date)).toBe('Just now');
    });

    it('returns minutes format for dates less than 1 hour ago', () => {
        const date = new Date(Date.now() - 15 * 60_000); // 15 minutes ago
        expect(formatRelativeTime(date)).toBe('15m ago');
    });

    it('returns hours format for dates less than 24 hours ago', () => {
        const date = new Date(Date.now() - 3 * 3600_000); // 3 hours ago
        expect(formatRelativeTime(date)).toBe('3h ago');
    });

    it('returns localised date string for dates older than 24 hours', () => {
        const date = new Date(Date.now() - 48 * 3600_000); // 2 days ago
        const result = formatRelativeTime(date);
        // Should be a date string, not a relative time
        expect(result).not.toContain('ago');
        expect(result).not.toBe('Never');
    });
});

describe('formatSyncStatus', () => {
    it('returns "Never synced" for null', () => {
        expect(formatSyncStatus(null)).toBe('Never synced');
    });

    it('delegates to formatRelativeTime for a real date', () => {
        const date = new Date(Date.now() - 5 * 60_000);
        expect(formatSyncStatus(date)).toBe('5m ago');
    });
});

describe('formatDuration', () => {
    it('formats seconds to minutes', () => {
        expect(formatDuration(3600)).toBe('60 min');
        expect(formatDuration(90)).toBe('2 min');
        expect(formatDuration(0)).toBe('0 min');
    });
});

describe('formatDistance', () => {
    it('formats metres to km with 2 decimal places', () => {
        expect(formatDistance(5000)).toBe('5.00 km');
        expect(formatDistance(1234)).toBe('1.23 km');
        expect(formatDistance(0)).toBe('0.00 km');
    });
});

describe('pluralise', () => {
    it('returns singular for count of 1', () => {
        expect(pluralise(1, 'workout')).toBe('workout');
    });

    it('returns default plural (adds s) for other counts', () => {
        expect(pluralise(0, 'workout')).toBe('workouts');
        expect(pluralise(5, 'workout')).toBe('workouts');
    });

    it('uses custom plural when provided', () => {
        expect(pluralise(3, 'activity', 'activities')).toBe('activities');
        expect(pluralise(1, 'activity', 'activities')).toBe('activity');
    });
});

describe('formatTime', () => {
    it('formats morning time with zero-padded hours', () => {
        const date = new Date(2026, 0, 1, 9, 5);
        expect(formatTime(date)).toBe('09:05');
    });

    it('formats afternoon time', () => {
        const date = new Date(2026, 0, 1, 14, 30);
        expect(formatTime(date)).toBe('14:30');
    });

    it('formats midnight', () => {
        const date = new Date(2026, 0, 1, 0, 0);
        expect(formatTime(date)).toBe('00:00');
    });

    it('formats end of day', () => {
        const date = new Date(2026, 0, 1, 23, 59);
        expect(formatTime(date)).toBe('23:59');
    });
});
