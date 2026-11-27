import { afterEach, describe, expect, it, vi } from 'vitest';

describe('runtime API configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses api mode and strips a trailing slash from the API URL', async () => {
    vi.stubEnv('VITE_DATA_MODE', 'api');
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/');
    vi.resetModules();

    const { API_BASE_URL, API_MODE } = await import('./runtime');

    expect(API_MODE).toBe(true);
    expect(API_BASE_URL).toBe('https://api.example.com');
  });

  it('defaults to mock mode with an empty API URL', async () => {
    vi.stubEnv('VITE_DATA_MODE', undefined);
    vi.stubEnv('VITE_API_BASE_URL', undefined);
    vi.resetModules();

    const { API_BASE_URL, API_MODE } = await import('./runtime');

    expect(API_MODE).toBe(false);
    expect(API_BASE_URL).toBe('');
  });
});
