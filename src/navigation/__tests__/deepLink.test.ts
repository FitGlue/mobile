import {
  resolveDeepLinkPath,
  sanitizeSpaPath,
  buildNavigateScript,
  buildWebAppUrl,
} from '../deepLink';

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

describe('sanitizeSpaPath', () => {
  it('leaves ordinary paths untouched', () => {
    expect(sanitizeSpaPath('/activities/act-9')).toBe('/activities/act-9');
  });

  it('strips characters that could break out of the JS string literal', () => {
    expect(sanitizeSpaPath("/a'); alert(1);//")).toBe('/a); alert(1);//');
    expect(sanitizeSpaPath('/a"b`c\\d')).toBe('/abcd');
  });
});

describe('buildNavigateScript', () => {
  it('wraps the sanitized path in a guarded __fg.navigate call', () => {
    expect(buildNavigateScript('/activities/act-9')).toBe(
      "window.__fg && window.__fg.navigate('/activities/act-9'); true;",
    );
  });

  it('sanitizes the path before embedding it', () => {
    expect(buildNavigateScript("/x')//")).toBe(
      "window.__fg && window.__fg.navigate('/x)//'); true;",
    );
  });
});

describe('buildWebAppUrl', () => {
  it('loads the SPA root (with trailing slash) when there is no deep link', () => {
    expect(buildWebAppUrl('https://fitglue.tech')).toBe('https://fitglue.tech/app/');
    expect(buildWebAppUrl('https://fitglue.tech', null)).toBe('https://fitglue.tech/app/');
  });

  it('loads a deep-linked path directly under the /app basename', () => {
    expect(buildWebAppUrl('https://fitglue.tech', '/activities/act-9')).toBe(
      'https://fitglue.tech/app/activities/act-9',
    );
  });
});
