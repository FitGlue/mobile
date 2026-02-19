/**
 * FitGlue Mobile Shared Formatters
 *
 * Utility functions for formatting dates, times, and other display values.
 * Extracted from HomeScreen/SettingsScreen to eliminate duplication.
 */

/**
 * Format a date relative to now (e.g. "Just now", "5m ago", "3h ago")
 */
export function formatRelativeTime(date: Date | null): string {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString();
}

/**
 * Format sync status with a "Last sync:" prefix
 */
export function formatSyncStatus(date: Date | null): string {
    if (!date) return 'Never synced';
    return formatRelativeTime(date);
}

/**
 * Format workout duration in minutes
 */
export function formatDuration(seconds: number): string {
    return `${Math.round(seconds / 60)} min`;
}

/**
 * Format distance in km from metres
 */
export function formatDistance(metres: number): string {
    return `${(metres / 1000).toFixed(2)} km`;
}

/**
 * Pluralise a word based on count
 */
export function pluralise(count: number, singular: string, plural?: string): string {
    return count === 1 ? singular : (plural ?? `${singular}s`);
}

/**
 * Format a Date to HH:MM time string
 */
export function formatTime(date: Date): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
}
