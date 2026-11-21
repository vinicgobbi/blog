import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/theme/theme.service';

/** Item do menu da área admin; cada seção entra junto com a sua funcionalidade. */
export interface AdminMenuItem {
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
}

export const ADMIN_MENU: AdminMenuItem[] = [
  { label: 'Dashboard', icon: 'bi-speedometer2', link: '/admin', exact: true },
  { label: 'Posts', icon: 'bi-file-earmark-text', link: '/admin/posts' },
];

/**
 * Casca da área administrativa: menu, usuário logado, tema e saída.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
  host: { class: 'layout' },
})
export class AdminLayout {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  protected readonly menu = ADMIN_MENU;

  protected logout(): void {
    this.auth.logout().subscribe({
      complete: () => void this.router.navigate(['/admin/login']),
    });
  }
}
