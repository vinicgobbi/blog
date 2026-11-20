import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_URL } from '../api';
import { AuthService } from './auth.service';

/** Endpoints de autenticação não disparam refresh ao receber 401 (evita loops). */
const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/logout'];

/**
 * Anexa o token JWT às requisições para a API (e só para ela). Ao receber
 * 401 com uma sessão ativa, tenta renovar o token uma vez e repete a
 * requisição; se o refresh falhar, encerra a sessão e leva ao login.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const apiUrl = inject(API_URL);

  if (!request.url.startsWith(apiUrl)) {
    return next(request);
  }

  const token = auth.token();

  return next(token ? withToken(request, token) : request).pipe(
    catchError((error: unknown) => {
      const canRefresh =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        token !== null &&
        !AUTH_ENDPOINTS.some((endpoint) => request.url === `${apiUrl}${endpoint}`);

      if (!canRefresh) {
        return throwError(() => error);
      }

      return auth.refresh().pipe(
        catchError(() => {
          auth.clearSession();
          void router.navigate(['/admin/login'], { queryParams: { redirect: router.url } });

          return throwError(() => error);
        }),
        switchMap((newToken) => next(withToken(request, newToken))),
      );
    }),
  );
};

function withToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
