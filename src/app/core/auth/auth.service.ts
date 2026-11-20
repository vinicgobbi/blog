import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID, Service, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { ResourceResponse } from '../../shared/models/api';
import { AuthToken, LoginCredentials, User } from '../../shared/models/auth';
import { API_URL } from '../api';

export const AUTH_TOKEN_STORAGE_KEY = 'blog.auth.token';

/**
 * Sessão do administrador.
 *
 * O token JWT fica no localStorage apenas no navegador; durante o SSR não há
 * sessão (a área admin é renderizada só no cliente).
 */
@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly storage = isPlatformBrowser(inject(PLATFORM_ID))
    ? globalThis.localStorage
    : null;

  private readonly tokenState = signal<string | null>(this.readStoredToken());
  private readonly userState = signal<User | null>(null);
  private refreshInFlight: Observable<string> | null = null;

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => this.tokenState() !== null);

  login(credentials: LoginCredentials): Observable<User> {
    return this.http.post<AuthToken>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((response) => this.storeToken(response.access_token)),
      switchMap(() => this.loadUser()),
    );
  }

  loadUser(): Observable<User> {
    return this.http.get<ResourceResponse<User>>(`${this.apiUrl}/auth/user`).pipe(
      map((response) => response.data),
      tap((user) => this.userState.set(user)),
    );
  }

  /**
   * Troca o token atual por um novo. Chamadas simultâneas compartilham a
   * mesma requisição, pois a API invalida o token antigo a cada refresh.
   */
  refresh(): Observable<string> {
    this.refreshInFlight ??= this.http.post<AuthToken>(`${this.apiUrl}/auth/refresh`, {}).pipe(
      map((response) => response.access_token),
      tap((token) => this.storeToken(token)),
      finalize(() => (this.refreshInFlight = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.refreshInFlight;
  }

  /** Invalida o token na API e limpa a sessão local, mesmo se a API falhar. */
  logout(): Observable<void> {
    return this.http.post(`${this.apiUrl}/auth/logout`, {}).pipe(
      catchError(() => of(null)),
      map(() => undefined),
      finalize(() => this.clearSession()),
    );
  }

  clearSession(): void {
    this.tokenState.set(null);
    this.userState.set(null);
    this.safeStorage((storage) => storage.removeItem(AUTH_TOKEN_STORAGE_KEY));
  }

  private storeToken(token: string): void {
    this.tokenState.set(token);
    this.safeStorage((storage) => storage.setItem(AUTH_TOKEN_STORAGE_KEY, token));
  }

  private readStoredToken(): string | null {
    return this.safeStorage((storage) => storage.getItem(AUTH_TOKEN_STORAGE_KEY)) ?? null;
  }

  /** O acesso ao localStorage pode lançar erro (ex.: navegação privada bloqueada). */
  private safeStorage<T>(action: (storage: Storage) => T): T | undefined {
    if (!this.storage) {
      return undefined;
    }

    try {
      return action(this.storage);
    } catch {
      return undefined;
    }
  }
}
