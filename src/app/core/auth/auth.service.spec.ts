import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { User } from '../../shared/models/auth';
import { API_URL } from '../api';
import { AUTH_TOKEN_STORAGE_KEY, AuthService } from './auth.service';

const API = 'http://api.test/api';
const ADMIN: User = { id: 1, name: 'Admin', email: 'admin@blog.test' };

function setup(platform: 'browser' | 'server' = 'browser') {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
      { provide: PLATFORM_ID, useValue: platform },
    ],
  });

  return { auth: TestBed.inject(AuthService), http: TestBed.inject(HttpTestingController) };
}

describe('AuthService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('login stores the token and loads the user', async () => {
    const { auth, http } = setup();

    const user = firstValueFrom(auth.login({ email: 'admin@blog.test', password: 'senha' }));
    const loginRequest = http.expectOne(`${API}/auth/login`);
    expect(loginRequest.request.body).toEqual({ email: 'admin@blog.test', password: 'senha' });
    loginRequest.flush({ access_token: 'token-1', token_type: 'bearer', expires_in: 7200 });
    http.expectOne(`${API}/auth/user`).flush({ data: ADMIN });

    expect(await user).toEqual(ADMIN);
    expect(auth.token()).toBe('token-1');
    expect(auth.user()).toEqual(ADMIN);
    expect(auth.isAuthenticated()).toBe(true);
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('token-1');
  });

  it('restores the session token saved in the browser', () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'token-salvo');

    const { auth } = setup();

    expect(auth.token()).toBe('token-salvo');
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('does not read the browser storage during server rendering', () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'token-salvo');

    const { auth } = setup('server');

    expect(auth.isAuthenticated()).toBe(false);
  });

  it('logout clears the session even when the API request fails', async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'token-salvo');
    const { auth, http } = setup();

    const done = firstValueFrom(auth.logout());
    http.expectOne(`${API}/auth/logout`).flush(null, { status: 500, statusText: 'Erro' });
    await done;

    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('simultaneous refresh calls share a single request', async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'token-antigo');
    const { auth, http } = setup();

    const first = firstValueFrom(auth.refresh());
    const second = firstValueFrom(auth.refresh());
    http
      .expectOne(`${API}/auth/refresh`)
      .flush({ access_token: 'token-novo', token_type: 'bearer', expires_in: 7200 });

    expect(await first).toBe('token-novo');
    expect(await second).toBe('token-novo');
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('token-novo');
  });

  it('a later refresh sends a new request', async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'token-1');
    const { auth, http } = setup();

    const first = firstValueFrom(auth.refresh());
    http
      .expectOne(`${API}/auth/refresh`)
      .flush({ access_token: 'token-2', token_type: 'bearer', expires_in: 7200 });
    await first;

    const second = firstValueFrom(auth.refresh());
    http
      .expectOne(`${API}/auth/refresh`)
      .flush({ access_token: 'token-3', token_type: 'bearer', expires_in: 7200 });

    expect(await second).toBe('token-3');
  });
});
