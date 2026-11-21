import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { CommentCounts } from '../comments/comment-counts';

/** Item do menu da área admin; cada seção entra junto com a sua funcionalidade. */
export interface AdminMenuItem {
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
  /** Exibe ao lado do item a quantidade de comentários pendentes. */
  showsPendingComments?: boolean;
}

export const ADMIN_MENU: AdminMenuItem[] = [
  { label: 'Dashboard', icon: 'bi-speedometer2', link: '/admin', exact: true },
  { label: 'Posts', icon: 'bi-file-earmark-text', link: '/admin/posts' },
  { label: 'Categorias', icon: 'bi-folder', link: '/admin/categorias' },
  { label: 'Tags', icon: 'bi-tags', link: '/admin/tags' },
  { label: 'Páginas', icon: 'bi-file-earmark-richtext', link: '/admin/paginas' },
  {
    label: 'Comentários',
    icon: 'bi-chat-left-text',
    link: '/admin/comentarios',
    showsPendingComments: true,
  },
  { label: 'Mídia', icon: 'bi-images', link: '/admin/midia' },
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
  protected readonly commentCounts = inject(CommentCounts);
  private readonly router = inject(Router);

  protected readonly menu = ADMIN_MENU;

  protected logout(): void {
    this.auth.logout().subscribe({
      complete: () => void this.router.navigate(['/admin/login']),
    });
  }
}
