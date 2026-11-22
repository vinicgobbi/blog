import { isPlatformBrowser } from '@angular/common';
import {
  DOCUMENT,
  DestroyRef,
  Injectable,
  InjectionToken,
  PLATFORM_ID,
  Provider,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';

/** Cada menu lateral guarda o próprio estado (recolhido ou não). */
export type SidebarName = 'blog' | 'admin';

export const SIDEBAR_NAME = new InjectionToken<SidebarName>('SIDEBAR_NAME');

/** A partir desta largura o menu é uma coluna fixa; abaixo, vira gaveta (ver styles/_sidebar.scss). */
export const SIDEBAR_WIDE_QUERY = '(min-width: 960px)';

/** Chave do localStorage e atributo do <html> lidos também pelo script inline do index.html. */
export function sidebarStorageKey(name: SidebarName): string {
  return `sidebar.${name}`;
}

export function sidebarAttribute(name: SidebarName): string {
  return `data-sidebar-${name}`;
}

/** Fornece um estado de menu lateral para o componente e seus filhos. */
export function provideSidebar(name: SidebarName): Provider[] {
  return [{ provide: SIDEBAR_NAME, useValue: name }, SidebarState];
}

/**
 * Estado de um menu lateral: recolhido (só ícones, em telas largas) e gaveta
 * aberta (telas estreitas).
 *
 * O estado recolhido inicial é aplicado por um script inline no index.html,
 * como atributo do <html>, para o menu não "piscar" aberto antes do Angular
 * carregar. Aqui só sincronizamos o estado e tratamos a troca.
 */
@Injectable()
export class SidebarState {
  readonly name = inject(SIDEBAR_NAME);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly collapsed = signal(false);
  readonly menuOpen = signal(false);
  private readonly wide = signal(false);
  /** As dicas só aparecem quando os rótulos estão escondidos: menu recolhido em tela larga. */
  readonly showTooltips = computed(() => this.collapsed() && this.wide());

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const attribute = this.document.documentElement.getAttribute(sidebarAttribute(this.name));
      this.collapsed.set(attribute === 'collapsed');

      const view = this.document.defaultView;

      if (typeof view?.matchMedia !== 'function') {
        return;
      }

      const media = view.matchMedia(SIDEBAR_WIDE_QUERY);
      const onChange = (event: MediaQueryListEvent) => this.wide.set(event.matches);
      this.wide.set(media.matches);
      media.addEventListener('change', onChange);
      destroyRef.onDestroy(() => media.removeEventListener('change', onChange));
    });
  }

  toggleCollapsed(): void {
    const collapsed = !this.collapsed();
    const value = collapsed ? 'collapsed' : 'expanded';
    this.collapsed.set(collapsed);
    this.document.documentElement.setAttribute(sidebarAttribute(this.name), value);

    if (!this.isBrowser) {
      return;
    }

    try {
      localStorage.setItem(sidebarStorageKey(this.name), value);
    } catch {
      // Armazenamento indisponível (ex.: modo privado): o estado vale só para esta visita.
    }
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
