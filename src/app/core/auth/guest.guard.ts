import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Tela de login: quem já tem sessão vai direto para o painel. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);

  return auth.isAuthenticated() ? inject(Router).createUrlTree(['/admin']) : true;
};
