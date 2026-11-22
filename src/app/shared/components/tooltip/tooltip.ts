import { DOCUMENT, DestroyRef, Directive, ElementRef, effect, inject, input } from '@angular/core';

/** Distância entre o elemento e a dica, em pixels. */
const TOOLTIP_GAP = 10;

/**
 * Dica no tema do site, à direita do elemento, ao passar o mouse ou focar com o
 * teclado. Fica no <body> com posição fixa, para não ser cortada por áreas com
 * rolagem (ex.: a lista do menu lateral), e fecha com Esc.
 *
 * É só visual (aria-hidden): o elemento precisa ter o próprio nome acessível,
 * como um rótulo escondido visualmente.
 */
@Directive({
  selector: '[appTooltip]',
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
    '(focusin)': 'show()',
    '(focusout)': 'hide()',
    '(click)': 'hide()',
    '(document:keydown.escape)': 'hide()',
  },
})
export class Tooltip {
  readonly text = input.required<string>({ alias: 'appTooltip' });
  /** Com true a dica não aparece (ex.: menu expandido, com os rótulos visíveis). */
  readonly disabled = input(false, { alias: 'appTooltipDisabled' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private tooltip: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.disabled()) {
        this.hide();
      }
    });
    inject(DestroyRef).onDestroy(() => this.hide());
  }

  protected show(): void {
    const text = this.text();

    if (this.disabled() || !text) {
      return;
    }

    const tooltip = this.tooltip ?? this.document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.textContent = text;

    const { top, height, right } = this.host.nativeElement.getBoundingClientRect();
    tooltip.style.top = `${top + height / 2}px`;
    tooltip.style.left = `${right + TOOLTIP_GAP}px`;

    this.document.body.appendChild(tooltip);
    this.tooltip = tooltip;
  }

  protected hide(): void {
    this.tooltip?.remove();
    this.tooltip = null;
  }
}
