// Deep-link resolution for push notifications. The server sends a notification
// data payload that may carry a `screen` key (mapped to an SPA path here), an
// optional `id` appended as a path segment, and/or an explicit `path` that wins
// outright. The resolved value is a basename-relative SPA path (no /app prefix)
// that MainScreen's web view navigates to.

export interface NotificationDeepLinkData {
  screen?: string;
  id?: string;
  path?: string;
}

// Maps notification payload `screen` values to basename-relative SPA paths (no /app prefix).
export const SCREEN_TO_PATH: Record<string, string> = {
  activity: '/activities',
  activities: '/activities',
  pipeline: '/settings/pipelines',
  pipelines: '/settings/pipelines',
  sync: '',
};

/**
 * Resolve the SPA-relative path a notification should deep-link to.
 * Returns null when there's no navigable target — e.g. neither `screen` nor
 * `path` was provided, or the only signal was a `sync` screen (which just
 * brings the app to the foreground without navigating).
 */
export function resolveDeepLinkPath(data: NotificationDeepLinkData | undefined): string | null {
  if (!data?.screen && !data?.path) return null;

  const basePath = data.screen ? SCREEN_TO_PATH[data.screen] ?? null : null;
  const webPath =
    data.path ??
    (data.id && basePath && data.screen !== 'sync' ? `${basePath}/${data.id}` : null) ??
    basePath;

  return webPath ? webPath : null;
}
