import { Component, Signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  IsActiveMatchOptions,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sidebar, SidebarGroup, SidebarState, provideSidebar } from '@vinicgobbi/ui/sidebar';
import { ThemeService } from '@vinicgobbi/ui/theme';
import { Tooltip } from '@vinicgobbi/ui/tooltip';
import { BlogApi, TaxonomyKind } from '../../features/blog/blog-api';
import { Category, Tag } from '../../shared/models/blog';

/** Grupo do menu que abre como pasta, com as categorias ou as tags. */
interface TaxonomyGroup {
  /** Primeiro segmento das rotas do grupo (ex.: /categorias e /categorias/:slug). */
  path: string;
  label: string;
  icon: string;
  itemIcon: string;
  allLabel: string;
  items: Signal<(Category | Tag)[]>;
}

/**
 * Menu lateral do blog: início, categorias e tags (como pastas que abrem com a lista), páginas
 * publicadas (na ordem definida no admin) e, na linha de ícones, feed RSS e troca de tema.
 */
@Component({
  selector: 'app-site-sidebar',
  imports: [RouterLink, RouterLinkActive, Sidebar, SidebarGroup, Tooltip],
  templateUrl: './site-sidebar.html',
  providers: [provideSidebar('blog')],
  host: { style: 'display: contents' },
})
export class SiteSidebar {
  protected readonly theme = inject(ThemeService);
  protected readonly sidebar = inject(SidebarState);
  protected readonly siteName = environment.siteName;
  protected readonly feedUrl = environment.feedUrl;

  private readonly api = inject(BlogApi);
  private readonly router = inject(Router);

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

  protected readonly groups: TaxonomyGroup[] = [
    {
      path: 'categorias',
      label: 'Categorias',
      icon: 'folder2',
      itemIcon: 'folder',
      allLabel: 'Todas as categorias',
      items: this.taxonomy('categories'),
    },
    {
      path: 'tags',
      label: 'Tags',
      icon: 'tags',
      itemIcon: 'tag',
      allLabel: 'Todas as tags',
      items: this.taxonomy('tags'),
    },
  ];

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Grupo da página atual (ex.: `categorias` em /categorias/angular), que já abre. */
  protected readonly activeGroup = computed(() => this.url().split(/[?#]/)[0].split('/')[1] ?? '');

  private readonly pagesResource = this.api.pages();
  /** Páginas publicadas (ex.: Sobre); se a API falhar, o menu fica só com os links fixos. */
  protected readonly pages = computed(() =>
    this.pagesResource.hasValue() ? (this.pagesResource.value()?.data ?? []) : [],
  );

  /** Categorias ou tags com posts; se a API falhar, a pasta mostra só o link para a listagem. */
  private taxonomy(kind: TaxonomyKind): Signal<(Category | Tag)[]> {
    const resource = this.api.taxonomies(() => kind);

    return computed(() => (resource.hasValue() ? (resource.value()?.data ?? []) : []));
  }
}
