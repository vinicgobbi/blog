import { Component, computed, inject } from '@angular/core';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Sidebar, SidebarState, provideSidebar } from '@vinicgobbi/ui/sidebar';
import { ThemeService } from '@vinicgobbi/ui/theme';
import { Tooltip } from '@vinicgobbi/ui/tooltip';
import { BlogApi } from '../../features/blog/blog-api';

/**
 * Menu lateral do blog: links fixos, páginas publicadas (na ordem definida no
 * admin), feed RSS e troca de tema.
 */
@Component({
  selector: 'app-site-sidebar',
  imports: [RouterLink, RouterLinkActive, Sidebar, Tooltip],
  templateUrl: './site-sidebar.html',
  providers: [provideSidebar('blog')],
  host: { style: 'display: contents' },
})
export class SiteSidebar {
  protected readonly theme = inject(ThemeService);
  protected readonly sidebar = inject(SidebarState);
  protected readonly siteName = environment.siteName;
  protected readonly feedUrl = environment.feedUrl;

  protected readonly themeLabel = computed(() =>
    this.theme.theme() === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro',
  );

  /** Início fica ativo também na busca e nas demais páginas da listagem (`/?q=`, `/?page=`). */
  protected readonly homeActiveOptions: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };

  private readonly pagesResource = inject(BlogApi).pages();
  /** Páginas publicadas (ex.: Sobre); se a API falhar, o menu fica só com os links fixos. */
  protected readonly pages = computed(() =>
    this.pagesResource.hasValue() ? (this.pagesResource.value()?.data ?? []) : [],
  );
}
