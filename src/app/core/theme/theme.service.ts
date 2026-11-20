import { DOCUMENT, PLATFORM_ID, Service, afterNextRender, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'theme';

/**
 * Tema claro/escuro, igual ao do portfólio (vinicgobbi.dev.br).
 *
 * O tema inicial é aplicado por um script inline no index.html (antes do
 * Angular carregar), para não haver "flash" de tema errado. Aqui só
 * sincronizamos o estado e tratamos a troca.
 */
@Service()
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly theme = signal<Theme>('dark');

  constructor() {
    afterNextRender(() => {
      const current = this.document.documentElement.getAttribute('data-theme');
      this.theme.set(current === 'light' ? 'light' : 'dark');
    });
  }

  toggle(): void {
    const theme: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(theme);
    this.document.documentElement.setAttribute('data-theme', theme);

    if (!this.isBrowser) {
      return;
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Armazenamento indisponível (ex.: modo privado): o tema vale só para esta visita.
    }
  }
}
