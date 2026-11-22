import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
} from '@angular/core';
import { Toast, ToastKind, ToastService } from './toast.service';

const ICONS: Record<ToastKind, string> = {
  success: 'bi-check-circle-fill',
  error: 'bi-x-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill',
};

/** Prefixo lido pelo leitor de tela, já que o tipo só aparece pela cor e pelo ícone. */
const LABELS: Record<ToastKind, string> = {
  success: 'Sucesso',
  error: 'Erro',
  warning: 'Aviso',
  info: 'Informação',
};

/**
 * Exibe os toasts do ToastService no canto superior direito. Fica uma vez em
 * app.html; um <dialog> modal pode ter o seu próprio, que passa à frente
 * enquanto o diálogo está aberto (o da raiz ficaria atrás do modal e inerte).
 *
 * As duas listas são regiões "live" que existem desde o início, para o leitor de
 * tela anunciar cada toast: erros com prioridade (assertive), o resto sem
 * interromper (polite).
 */
@Component({
  selector: 'app-toast-outlet',
  template: `
    @for (list of lists; track list.live) {
      <ol class="toaster__list" [attr.aria-live]="list.live" aria-relevant="additions">
        @if (isActive()) {
          @for (toast of list.toasts(); track toast.id) {
            <li
              class="toast toast--{{ toast.kind }}"
              [attr.data-toast-id]="toast.id"
              animate.enter="toast--enter"
              animate.leave="toast--leave"
            >
              <i class="toast__icon bi {{ icons[toast.kind] }}" aria-hidden="true"></i>
              <p class="toast__message">
                <span class="visually-hidden">{{ labels[toast.kind] }}: </span>{{ toast.message }}
              </p>
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-icon toast__close"
                aria-label="Fechar notificação"
                (click)="close(toast)"
              >
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </li>
          }
        }
      </ol>
    }
  `,
  styleUrl: './toast-outlet.scss',
  host: {
    '(mouseenter)': 'setHovered(true)',
    '(mouseleave)': 'setHovered(false)',
    '(focusin)': 'setFocused(true)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class ToastOutlet {
  protected readonly toastService = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  protected readonly icons = ICONS;
  protected readonly labels = LABELS;
  protected readonly isActive = computed(() => this.toastService.activeOutlet() === this);
  protected readonly errors = computed(() =>
    this.toastService.toasts().filter((toast) => toast.kind === 'error'),
  );
  protected readonly others = computed(() =>
    this.toastService.toasts().filter((toast) => toast.kind !== 'error'),
  );
  protected readonly lists = [
    { live: 'assertive', toasts: this.errors },
    { live: 'polite', toasts: this.others },
  ] as const;

  private hovered = false;
  private focused = false;

  constructor() {
    inject(DestroyRef).onDestroy(this.toastService.registerOutlet(this));
  }

  protected setHovered(value: boolean): void {
    this.hovered = value;
    this.syncPause();
  }

  protected setFocused(value: boolean): void {
    this.focused = value;
    this.syncPause();
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    this.setFocused(next instanceof Node && this.host.nativeElement.contains(next));
  }

  /** Fecha o toast; pelo teclado, o foco segue para o próximo toast em vez de se perder. */
  protected close(toast: Toast): void {
    const hadFocus = this.host.nativeElement.contains(this.document.activeElement);
    const visible = [...this.errors(), ...this.others()];
    const index = visible.findIndex(({ id }) => id === toast.id);
    const next = visible[index + 1] ?? visible[index - 1];

    this.toastService.dismiss(toast.id);

    if (!hadFocus || !next) {
      this.setFocused(false);

      return;
    }

    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector<HTMLButtonElement>(`[data-toast-id="${next.id}"] .toast__close`)
          ?.focus(),
      { injector: this.injector },
    );
  }

  private syncPause(): void {
    if (this.hovered || this.focused) {
      this.toastService.pause();
    } else {
      this.toastService.resume();
    }
  }
}
