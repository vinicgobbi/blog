import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Protege a área administrativa. Sem sessão, redireciona ao login
 * guardando a URL de destino em `?redirect=`. Com token salvo mas usuário
 * ainda não carregado (ex.: página recarregada), valida a sessão na API.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const loginUrl = router.createUrlTree(['/admin/login'], { queryParams: { redirect: state.url } });

  if (!auth.isAuthenticated()) {
    return loginUrl;
  }

  if (auth.user()) {
    return true;
  }

  return auth.loadUser().pipe(
    map(() => true),
    catchError(() => {
      auth.clearSession();

      return of(loginUrl);
    }),
  );
};
