import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import {
  FieldTree,
  FormField,
  TreeValidationResult,
  email,
  form,
  required,
  submit,
} from '@angular/forms/signals';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { safeAdminRedirect } from '../../../core/auth/safe-redirect';
import { SeoService } from '../../../core/seo/seo.service';
import { LoginCredentials } from '../../../shared/models/auth';

/**
 * Login do administrador (`/admin/login`).
 */
@Component({
  selector: 'app-login-page',
  imports: [FormField],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
  host: { class: 'layout' },
})
export class LoginPage {
  /** Preenchido pelo `?redirect=` deixado pelo authGuard. */
  readonly redirect = input<string | undefined>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly siteName = environment.siteName;
  protected readonly model = signal<LoginCredentials>({ email: '', password: '' });
  protected readonly loginForm = form(this.model, (path) => {
    required(path.email, { message: 'Informe seu e-mail.' });
    email(path.email, { message: 'Informe um e-mail válido.' });
    required(path.password, { message: 'Informe sua senha.' });
  });
  protected readonly failure = signal<string | null>(null);

  constructor() {
    inject(SeoService).update({ title: 'Entrar', path: '/admin/login', noindex: true });
  }

  protected async login(event: Event): Promise<void> {
    event.preventDefault();
    this.failure.set(null);

    await submit(this.loginForm, (field) => this.authenticate(field));
  }

  private async authenticate(field: FieldTree<LoginCredentials>): Promise<TreeValidationResult> {
    try {
      await firstValueFrom(this.auth.login(this.model()));
    } catch (error) {
      return this.handleError(error, field);
    }

    await this.router.navigateByUrl(safeAdminRedirect(this.redirect()));

    return undefined;
  }

  private handleError(error: unknown, field: FieldTree<LoginCredentials>): TreeValidationResult {
    const status = error instanceof HttpErrorResponse ? error.status : 0;

    if (status === 422) {
      const errors = ((error as HttpErrorResponse).error?.errors ?? {}) as Partial<
        Record<string, string[]>
      >;

      return (['email', 'password'] as const)
        .filter((name) => errors[name]?.length)
        .map((name) => ({ kind: 'server', message: errors[name]![0], fieldTree: field[name] }));
    }

    this.failure.set(
      status === 401
        ? 'E-mail ou senha incorretos.'
        : status === 429
          ? 'Muitas tentativas de login. Aguarde um minuto e tente novamente.'
          : 'Não foi possível entrar agora. Tente novamente.',
    );

    return undefined;
  }
}
