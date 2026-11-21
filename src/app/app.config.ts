import { DATE_PIPE_DEFAULT_OPTIONS, registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideClientHydration,
  withEventReplay,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';

registerLocaleData(localePt, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideClientHydration(
      withEventReplay(),
      // A API (Laravel) responde com "Cache-Control: no-cache, private" por padrão, o que faria
      // o Angular descartar as respostas buscadas no SSR e repetir as requisições no navegador.
      // Os dados públicos do blog não são pessoais; requisições com Authorization (admin)
      // continuam fora do cache de transferência (includeRequestsWithAuthHeaders é false).
      withHttpTransferCacheOptions({ includeNonCacheableRequests: true }),
    ),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    // Fuso fixo de Brasília: servidor (SSR) e navegador exibem a mesma data.
    { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { timezone: '-0300' } },
  ],
};
