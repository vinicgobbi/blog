import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';

/** URL base da blog-api (sem barra no final). */
export const API_URL = new InjectionToken<string>('API_URL', {
  factory: () => environment.apiUrl,
});
