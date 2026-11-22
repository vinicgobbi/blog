import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IsActiveMatchOptions,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ThemeService } from '../../core/theme/theme.service';
import { BlogApi } from '../../features/blog/blog-api';

/**
 * Menu lateral do blog: coluna fixa em telas largas e gaveta aberta pela barra do topo no celular.
 */
@Component({
  selector: 'app-site-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './site-sidebar.html',
  styleUrl: './site-sidebar.scss',
  host: { '(document:keydown.escape)': 'closeMenu(true)' },
})
export class SiteSidebar {
  protected readonly theme = inject(ThemeService);
  protected readonly siteName = environment.siteName;
  protected readonly feedUrl = environment.feedUrl;

  /** Início fica ativo também na busca e nas demais páginas da listagem (`/?q=`, `/?page=`). */
  protected readonly homeActiveOptions: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };

  /** Gaveta aberta no celular; em telas largas o menu fica sempre visível. */
  protected readonly menuOpen = signal(false);

  private readonly menuToggle = viewChild<ElementRef<HTMLButtonElement>>('menuToggle');

  private readonly pagesResource = inject(BlogApi).pages();
  /** Páginas publicadas (ex.: Sobre); se a API falhar, o menu fica só com os links fixos. */
  protected readonly pages = computed(() =>
    this.pagesResource.hasValue() ? (this.pagesResource.value()?.data ?? []) : [],
  );

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.closeMenu());
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  /** Fecha a gaveta; com `restoreFocus`, devolve o foco ao botão que a abriu (ex.: ao apertar Esc). */
  protected closeMenu(restoreFocus = false): void {
    if (!this.menuOpen()) {
      return;
    }

    this.menuOpen.set(false);

    if (restoreFocus) {
      this.menuToggle()?.nativeElement.focus();
    }
  }
}
