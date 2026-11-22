import { DOCUMENT, Service, inject } from '@angular/core';

/** Espera antes da primeira dica, para não piscar ao passar o mouse por cima de passagem. */
export const TOOLTIP_SHOW_DELAY = 350;
/** Tempo, depois de esconder, em que a próxima dica aparece na hora e desliza até o novo item. */
export const TOOLTIP_TRAVEL_WINDOW = 300;
/** Distância entre o elemento e a dica, em pixels. */
const TOOLTIP_GAP = 10;

export interface TooltipRequest {
  /** Quem pediu a dica; só ele pode escondê-la. */
  owner: object;
  text: string;
  anchor: HTMLElement;
  /** Mostra sem a espera inicial (ex.: foco pelo teclado). */
  immediate?: boolean;
}

/**
 * Camada única das dicas (diretiva appTooltip): uma dica por vez, no <body>, com
 * posição fixa à direita do elemento.
 *
 * Comportamento: espera um pouco para aparecer; se o mouse passa logo para outro
 * item, a mesma dica desliza até ele sem esperar; ao sair, some na hora.
 */
@Service()
export class TooltipLayer {
  private readonly document = inject(DOCUMENT);

  private element: HTMLElement | null = null;
  private owner: object | null = null;
  private pending: TooltipRequest | null = null;
  private showTimer: ReturnType<typeof setTimeout> | undefined;
  private removeTimer: ReturnType<typeof setTimeout> | undefined;

  show(request: TooltipRequest): void {
    clearTimeout(this.showTimer);
    this.pending = null;

    // Outra dica ainda visível ou acabou de sair: vai direto, deslizando até o novo item.
    if (this.element) {
      this.display(request);

      return;
    }

    if (request.immediate) {
      this.display(request);

      return;
    }

    this.pending = request;
    this.showTimer = setTimeout(() => {
      this.pending = null;
      this.display(request);
    }, TOOLTIP_SHOW_DELAY);
  }

  /** Esconde na hora; a dica fica um instante invisível para poder deslizar até o próximo item. */
  hide(owner: object): void {
    if (this.pending?.owner === owner) {
      clearTimeout(this.showTimer);
      this.pending = null;
    }

    if (!this.element || this.owner !== owner) {
      return;
    }

    this.owner = null;
    this.element.classList.add('tooltip--hidden');
    clearTimeout(this.removeTimer);
    this.removeTimer = setTimeout(() => this.remove(), TOOLTIP_TRAVEL_WINDOW);
  }

  /** Esconde e descarta na hora, sem a janela de deslizar (ex.: Esc ou elemento destruído). */
  dismiss(owner?: object): void {
    if (owner && this.pending?.owner === owner) {
      clearTimeout(this.showTimer);
      this.pending = null;
    }

    if (!owner || this.owner === owner) {
      clearTimeout(this.showTimer);
      this.pending = null;
      this.remove();
    }
  }

  private display({ owner, text, anchor }: TooltipRequest): void {
    clearTimeout(this.removeTimer);
    const { top, height, right } = anchor.getBoundingClientRect();
    const isNew = !this.element;
    const element = this.element ?? this.document.createElement('div');

    element.textContent = text;
    element.style.top = `${top + height / 2}px`;
    element.style.left = `${right + TOOLTIP_GAP}px`;
    element.classList.remove('tooltip--hidden');

    if (isNew) {
      element.className = 'tooltip tooltip--enter';
      element.setAttribute('aria-hidden', 'true');
      this.document.body.appendChild(element);
    } else {
      element.classList.remove('tooltip--enter');
    }

    this.element = element;
    this.owner = owner;
  }

  private remove(): void {
    clearTimeout(this.removeTimer);
    this.element?.remove();
    this.element = null;
    this.owner = null;
  }
}
