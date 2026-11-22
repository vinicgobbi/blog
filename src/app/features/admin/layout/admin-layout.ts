import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';
import { SidebarState, provideSidebar } from '../../../shared/components/sidebar/sidebar-state';
import { Tooltip } from '../../../shared/components/tooltip/tooltip';
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
 * Casca da área administrativa: menu lateral com as seções, usuário logado, tema e saída.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Sidebar, Tooltip],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
  providers: [provideSidebar('admin')],
  host: { class: 'layout layout--sidebar' },
})
export class AdminLayout {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly commentCounts = inject(CommentCounts);
  protected readonly sidebar = inject(SidebarState);
  private readonly router = inject(Router);

  protected readonly menu = ADMIN_MENU;

  protected readonly themeLabel = computed(() =>
    this.theme.theme() === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro',
  );

  /** Dica do item no menu recolhido; Comentários inclui os pendentes, já que o contador vira um ponto. */
  protected tooltip(item: AdminMenuItem): string {
    const pending = item.showsPendingComments ? this.commentCounts.pending() : 0;

    if (!pending) {
      return item.label;
    }

    return `${item.label} (${pending} ${pending === 1 ? 'pendente' : 'pendentes'})`;
  }

  protected logout(): void {
    this.auth.logout().subscribe({
      complete: () => void this.router.navigate(['/admin/login']),
    });
  }
}
