/**
 * Tests for the authenticated API client. firebase auth, environment, logger
 * and global fetch are mocked so we can assert token injection, JSON parsing
 * and error handling without any network.
 */

const mockGetIdToken = jest.fn();
const mockAuth: { currentUser: { getIdToken: jest.Mock } | null } = {
  currentUser: { getIdToken: mockGetIdToken },
};

jest.mock('../firebase', () => ({
  get auth() {
    return mockAuth;
  },
}));

jest.mock('../environment', () => ({
  apiConfig: { baseUrl: 'https://api.test' },
}));

const mockLoggerError = jest.fn();
jest.mock('../../utils/logger', () => ({
  logger: { error: (...args: unknown[]) => mockLoggerError(...args) },
}));

import { apiRequest, get, post, patch, del, put, endpoints } from '../api';

/** Build a fake fetch Response. */
function fakeResponse(opts: {
  status?: number;
  ok?: boolean;
  json?: unknown;
  contentType?: string | null;
  statusText?: string;
}) {
  const { status = 200, ok = true, json, contentType = 'application/json', statusText = '' } = opts;
  return {
    status,
    ok,
    statusText,
    headers: { get: (name: string) => (name === 'content-type' ? contentType : null) },
    json: jest.fn().mockResolvedValue(json),
  };
}

describe('api client', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    mockGetIdToken.mockReset().mockResolvedValue('tok-123');
    mockAuth.currentUser = { getIdToken: mockGetIdToken };
    mockLoggerError.mockClear();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  describe('apiRequest', () => {
    it('prepends the base URL and injects a bearer token + JSON content type', async () => {
      fetchMock.mockResolvedValue(fakeResponse({ json: { hello: 'world' } }));

      const res = await apiRequest<{ hello: string }>('/thing');

      expect(fetchMock).toHaveBeenCalledWith('https://api.test/thing', expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer tok-123',
        }),
      }));
      expect(res).toEqual({ data: { hello: 'world' }, status: 200, error: undefined });
    });

    it('omits the Authorization header when there is no signed-in user', async () => {
      mockAuth.currentUser = null;
      fetchMock.mockResolvedValue(fakeResponse({ json: {} }));

      await apiRequest('/thing');

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers.Authorization).toBeUndefined();
    });

    it('returns null token (no auth header) and logs when getIdToken throws', async () => {
      mockGetIdToken.mockRejectedValue(new Error('expired'));
      fetchMock.mockResolvedValue(fakeResponse({ json: {} }));

      await apiRequest('/thing');

      expect(mockLoggerError).toHaveBeenCalled();
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    });

    it('surfaces a server error message for non-ok JSON responses', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse({ ok: false, status: 400, json: { error: 'bad input' } }),
      );

      const res = await apiRequest('/thing');

      expect(res.status).toBe(400);
      expect(res.error).toBe('bad input');
    });

    it('falls back to statusText when a non-ok response has no error field', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse({ ok: false, status: 500, json: {}, statusText: 'Server Error' }),
      );

      const res = await apiRequest('/thing');

      expect(res.error).toBe('Server Error');
    });

    it('does not attempt to parse a non-JSON body', async () => {
      const resp = fakeResponse({ contentType: 'text/plain' });
      fetchMock.mockResolvedValue(resp);

      const res = await apiRequest('/thing');

      expect(resp.json).not.toHaveBeenCalled();
      expect(res.data).toBeUndefined();
    });

    it('returns a status-0 network error when fetch rejects', async () => {
      fetchMock.mockRejectedValue(new Error('offline'));

      const res = await apiRequest('/thing');

      expect(res).toEqual({ status: 0, error: 'offline' });
      expect(mockLoggerError).toHaveBeenCalled();
    });

    it('uses a generic message when fetch rejects with a non-Error', async () => {
      fetchMock.mockRejectedValue('weird');

      const res = await apiRequest('/thing');

      expect(res.error).toBe('Network error');
    });

    it('merges caller-supplied headers', async () => {
      fetchMock.mockResolvedValue(fakeResponse({ json: {} }));

      await apiRequest('/thing', { headers: { 'X-Custom': '1' } });

      expect(fetchMock.mock.calls[0][1].headers['X-Custom']).toBe('1');
    });
  });

  describe('verb helpers', () => {
    beforeEach(() => fetchMock.mockResolvedValue(fakeResponse({ json: {} })));

    it('get issues a GET', async () => {
      await get('/g');
      expect(fetchMock.mock.calls[0][1].method).toBe('GET');
    });

    it('del issues a DELETE', async () => {
      await del('/d');
      expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
    });

    it('post serialises the body to JSON', async () => {
      await post('/p', { a: 1 });
      const call = fetchMock.mock.calls[0][1];
      expect(call.method).toBe('POST');
      expect(call.body).toBe(JSON.stringify({ a: 1 }));
    });

    it('post sends an undefined body when none provided', async () => {
      await post('/p');
      expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
    });

    it('patch serialises the body to JSON', async () => {
      await patch('/p', { b: 2 });
      const call = fetchMock.mock.calls[0][1];
      expect(call.method).toBe('PATCH');
      expect(call.body).toBe(JSON.stringify({ b: 2 }));
    });

    it('put serialises the body to JSON', async () => {
      await put('/p', { c: 3 });
      const call = fetchMock.mock.calls[0][1];
      expect(call.method).toBe('PUT');
      expect(call.body).toBe(JSON.stringify({ c: 3 }));
    });
  });

  describe('endpoints', () => {
    it('exposes static and parameterised endpoints', () => {
      expect(endpoints.me).toBe('/api/v2/users/me');
      expect(endpoints.mobileSync).toBe('/api/v2/users/me/mobile/sync');
      expect(endpoints.mobileConnect('strava')).toBe(
        '/api/v2/users/me/integrations/strava/connect',
      );
    });
  });
});
