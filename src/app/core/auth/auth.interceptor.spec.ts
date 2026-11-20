import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../api';
import { authInterceptor } from './auth.interceptor';
import { AUTH_TOKEN_STORAGE_KEY, AuthService } from './auth.service';

const API = 'http://api.test/api';
const TOKEN_RESPONSE = (token: string) => ({
  access_token: token,
  token_type: 'bearer',
  expires_in: 7200,
});

function setup(storedToken: string | null = 'token-1') {
  if (storedToken) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, storedToken);
  }

  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_URL, useValue: API },
      { provide: PLATFORM_ID, useValue: 'browser' },
    ],
  });

  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);

  return {
    client: TestBed.inject(HttpClient),
    http: TestBed.inject(HttpTestingController),
    auth: TestBed.inject(AuthService),
    router,
  };
}

describe('authInterceptor', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('attaches the bearer token to API requests', () => {
    const { client, http } = setup();

    client.get(`${API}/posts`).subscribe();

    expect(http.expectOne(`${API}/posts`).request.headers.get('Authorization')).toBe(
      'Bearer token-1',
    );
  });

  it('never sends the token to other hosts', () => {
    const { client, http } = setup();

    client.get('https://outro-site.example/dados').subscribe();

    expect(
      http.expectOne('https://outro-site.example/dados').request.headers.has('Authorization'),
    ).toBe(false);
  });

  it('sends API requests without authorization when there is no session', () => {
    const { client, http } = setup(null);

    client.get(`${API}/posts`).subscribe();

    expect(http.expectOne(`${API}/posts`).request.headers.has('Authorization')).toBe(false);
  });

  it('refreshes the token after a 401 and retries the request with the new token', async () => {
    const { client, http } = setup();

    const response = firstValueFrom(client.get(`${API}/admin/posts`));
    http.expectOne(`${API}/admin/posts`).flush(null, { status: 401, statusText: 'Unauthorized' });

    const refresh = http.expectOne(`${API}/auth/refresh`);
    expect(refresh.request.headers.get('Authorization')).toBe('Bearer token-1');
    refresh.flush(TOKEN_RESPONSE('token-2'));

    const retry = http.expectOne(`${API}/admin/posts`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer token-2');
    retry.flush({ data: [] });

    expect(await response).toEqual({ data: [] });
  });

  it('ends the session and redirects to login when the refresh fails', async () => {
    const { client, http, auth, router } = setup();

    const response = firstValueFrom(client.get(`${API}/admin/posts`));
    http.expectOne(`${API}/admin/posts`).flush(null, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${API}/auth/refresh`).flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(response).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(auth.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/admin/login'], {
      queryParams: { redirect: '/' },
    });
  });

  it('does not try to refresh when the login itself returns 401', async () => {
    const { client, http } = setup(null);

    const response = firstValueFrom(client.post(`${API}/auth/login`, {}));
    http.expectOne(`${API}/auth/login`).flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(response).rejects.toMatchObject({ status: 401 });
    http.expectNone(`${API}/auth/refresh`);
  });

  it('passes through errors other than 401', async () => {
    const { client, http } = setup();

    const response = firstValueFrom(client.get(`${API}/posts`));
    http.expectOne(`${API}/posts`).flush(null, { status: 500, statusText: 'Erro' });

    await expect(response).rejects.toMatchObject({ status: 500 });
    http.expectNone(`${API}/auth/refresh`);
  });
});
