import { Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { Tooltip } from '../tooltip/tooltip';
import { SidebarState } from './sidebar-state';

/**
 * Casca dos menus laterais (blog e admin): coluna fixa em telas largas, que pode
 * ser recolhida para mostrar só os ícones, e gaveta aberta pela barra do topo
 * no celular. O conteúdo entra por projeção: `[sidebarBrand]`, a navegação e
 * `[sidebarFooter]`. Os estilos ficam em styles/_sidebar.scss.
 *
 * Requer um SidebarState no componente pai (ver provideSidebar).
 */
@Component({
  selector: 'app-sidebar',
  imports: [Tooltip],
  templateUrl: './sidebar.html',
  host: {
    style: 'display: contents',
    '(document:keydown.escape)': 'closeMenu(true)',
  },
})
export class Sidebar {
  protected readonly state = inject(SidebarState);

  private readonly menuToggle = viewChild<ElementRef<HTMLButtonElement>>('menuToggle');

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.state.closeMenu());
  }

  /** Fecha a gaveta; com `restoreFocus`, devolve o foco ao botão que a abriu (ex.: ao apertar Esc). */
  protected closeMenu(restoreFocus = false): void {
    if (!this.state.menuOpen()) {
      return;
    }

    this.state.closeMenu();

    if (restoreFocus) {
      this.menuToggle()?.nativeElement.focus();
    }
  }
}
