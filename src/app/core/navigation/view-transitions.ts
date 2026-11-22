import { DOCUMENT, inject } from '@angular/core';
import { Router, ViewTransitionInfo } from '@angular/router';

/** Atributo do <html> lido pelo CSS (styles/_view-transitions.scss) para escolher o sentido. */
export const NAV_DIRECTION_ATTRIBUTE = 'data-nav-direction';

export type NavDirection = 'forward' | 'back';

/**
 * Chamado pelo router a cada transição de página (withViewTransitions). Marca o
 * sentido da navegação no <html>: voltar e avançar pelo histórico do navegador
 * deslizam para a direita, os demais links para a esquerda. A marca sai quando a
 * animação termina.
 *
 * Roda em contexto de injeção, como o router exige.
 */
export function onViewTransitionCreated({ transition }: ViewTransitionInfo): void {
  const root = inject(DOCUMENT).documentElement;
  const trigger = inject(Router).currentNavigation()?.trigger;
  const direction: NavDirection = trigger === 'popstate' ? 'back' : 'forward';

  root.setAttribute(NAV_DIRECTION_ATTRIBUTE, direction);
  // Uma transição interrompida rejeita a promise; o atributo sai do mesmo jeito.
  transition.finished.finally(() => root.removeAttribute(NAV_DIRECTION_ATTRIBUTE)).catch(() => {});
}
