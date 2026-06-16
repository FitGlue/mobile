import { resolveDeepLinkPath } from '../deepLink';

describe('resolveDeepLinkPath', () => {
  it('returns null when neither screen nor path is provided', () => {
    expect(resolveDeepLinkPath(undefined)).toBeNull();
    expect(resolveDeepLinkPath({})).toBeNull();
  });

  it('uses an explicit server-provided path verbatim', () => {
    expect(resolveDeepLinkPath({ path: '/activities/act-123' })).toBe('/activities/act-123');
    expect(resolveDeepLinkPath({ path: '/inputs' })).toBe('/inputs');
  });

  it('prefers an explicit path over screen/id composition', () => {
    expect(
      resolveDeepLinkPath({ path: '/connections/strava', screen: 'activity', id: 'act-9' }),
    ).toBe('/connections/strava');
  });

  it('composes screen + id into a detail path', () => {
    expect(resolveDeepLinkPath({ screen: 'activity', id: 'act-9' })).toBe('/activities/act-9');
    expect(resolveDeepLinkPath({ screen: 'pipeline', id: 'p1' })).toBe('/settings/pipelines/p1');
  });

  it('falls back to the base screen path when no id is given', () => {
    expect(resolveDeepLinkPath({ screen: 'activities' })).toBe('/activities');
  });

  it('does not append an id to the sync screen and treats it as no navigation', () => {
    expect(resolveDeepLinkPath({ screen: 'sync' })).toBeNull();
    expect(resolveDeepLinkPath({ screen: 'sync', id: 'x' })).toBeNull();
  });

  it('returns null for an unknown screen with no path', () => {
    expect(resolveDeepLinkPath({ screen: 'mystery' })).toBeNull();
  });
});
