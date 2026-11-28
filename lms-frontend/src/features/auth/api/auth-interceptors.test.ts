import axios, { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupAuthInterceptors } from './auth-interceptors';
import * as refreshSession from './refresh-session';

describe('setupAuthInterceptors (lms-frontend)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects 401 from /api/auth/login directly without calling refreshAccessToken', async () => {
    const refreshSpy = vi
      .spyOn(refreshSession, 'refreshAccessToken')
      .mockResolvedValue('new-token');

    const client = axios.create({
      adapter: async (config) => {
        throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
          status: 401,
          statusText: 'Unauthorized',
          headers: new AxiosHeaders(),
          config,
          data: { message: 'Invalid username or password' },
        });
      },
    });
    setupAuthInterceptors(client);

    await expect(
      client.post('/api/auth/login', { username: 'lecturer1', password: 'wrong' }),
    ).rejects.toMatchObject({
      response: {
        status: 401,
        data: { message: 'Invalid username or password' },
      },
    });
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('refreshes access token once on 401 for protected routes', async () => {
    const refreshSpy = vi
      .spyOn(refreshSession, 'refreshAccessToken')
      .mockResolvedValue('fresh-token');

    let attempts = 0;
    const client = axios.create({
      adapter: async (config) => {
        attempts += 1;
        if (attempts === 1) {
          throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
            status: 401,
            statusText: 'Unauthorized',
            headers: new AxiosHeaders(),
            config,
            data: { message: 'Token expired' },
          });
        }
        return {
          status: 200,
          statusText: 'OK',
          headers: new AxiosHeaders(),
          config,
          data: { ok: true },
        };
      },
    });
    setupAuthInterceptors(client);

    const response = await client.get('/api/auth/me');
    expect(response.data).toEqual({ ok: true });
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(attempts).toBe(2);
  });
});
