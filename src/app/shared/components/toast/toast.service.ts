import { Service, computed, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

export interface ToastOptions {
  /** Tempo na tela, em milissegundos; o padrão depende do tipo (ver TOAST_DURATIONS). */
  duration?: number;
}

/** Erros e avisos ficam mais tempo, para dar tempo de ler o que deu errado. */
export const TOAST_DURATIONS: Record<ToastKind, number> = {
  success: 5000,
  info: 5000,
  warning: 7000,
  error: 8000,
};

/** Máximo de toasts na tela; ao passar disso, o mais antigo sai. */
export const TOAST_LIMIT = 4;

interface Timer {
  handle: ReturnType<typeof setTimeout> | undefined;
  remaining: number;
  startedAt: number;
}

/**
 * Notificações da aplicação (sucesso, erro, aviso e informação), exibidas pelo
 * ToastOutlet no canto superior direito. Cada toast some sozinho depois de um
 * tempo; o tempo pausa enquanto o mouse ou o foco estão sobre os toasts.
 *
 * Como o serviço é único, a mensagem sobrevive à navegação (ex.: criar um post e
 * ir para a URL de edição).
 */
@Service()
export class ToastService {
  private nextId = 0;
  private paused = false;
  private readonly timers = new Map<number, Timer>();
  private readonly state = signal<Toast[]>([]);
  private readonly outlets = signal<object[]>([]);

  /** Toasts visíveis, do mais novo para o mais antigo. */
  readonly toasts = this.state.asReadonly();

  /**
   * Outlet que exibe os toasts: o último registrado. Um outlet dentro de um
   * <dialog> modal passa à frente do da raiz, que ficaria atrás do modal.
   */
  readonly activeOutlet = computed(() => this.outlets().at(-1) ?? null);

  success(message: string, options?: ToastOptions): number {
    return this.show('success', message, options);
  }

  error(message: string, options?: ToastOptions): number {
    return this.show('error', message, options);
  }

  warning(message: string, options?: ToastOptions): number {
    return this.show('warning', message, options);
  }

  info(message: string, options?: ToastOptions): number {
    return this.show('info', message, options);
  }

  /** Mostra um toast; a mesma mensagem já visível não se repete, só volta ao topo e reinicia o tempo. */
  show(kind: ToastKind, message: string, options: ToastOptions = {}): number {
    const duration = options.duration ?? TOAST_DURATIONS[kind];
    const existing = this.state().find((toast) => toast.kind === kind && toast.message === message);
    const toast = existing ?? { id: this.nextId++, kind, message };

    const others = this.state().filter(({ id }) => id !== toast.id);
    const dropped = others.slice(TOAST_LIMIT - 1);
    dropped.forEach(({ id }) => this.clearTimer(id));
    this.state.set([toast, ...others.slice(0, TOAST_LIMIT - 1)]);

    this.clearTimer(toast.id);
    this.timers.set(toast.id, { handle: undefined, remaining: duration, startedAt: 0 });
    if (!this.paused) {
      this.startTimer(toast.id);
    }

    return toast.id;
  }

  dismiss(id: number): void {
    this.clearTimer(id);
    this.state.update((toasts) => toasts.filter((toast) => toast.id !== id));

    // Sem toasts não há mouse nem foco sobre eles: o próximo começa a contar normalmente.
    if (!this.state().length) {
      this.paused = false;
    }
  }

  clear(): void {
    this.timers.forEach((_, id) => this.clearTimer(id));
    this.state.set([]);
    this.paused = false;
  }

  /** Congela o tempo de todos os toasts (mouse ou foco sobre eles). */
  pause(): void {
    if (this.paused) {
      return;
    }

    this.paused = true;
    const now = Date.now();
    this.timers.forEach((timer) => {
      clearTimeout(timer.handle);
      timer.handle = undefined;
      timer.remaining = Math.max(0, timer.remaining - (now - timer.startedAt));
    });
  }

  resume(): void {
    if (!this.paused) {
      return;
    }

    this.paused = false;
    this.timers.forEach((_, id) => this.startTimer(id));
  }

  /** Registra um ToastOutlet; devolve a função que o remove. */
  registerOutlet(outlet: object): () => void {
    this.outlets.update((outlets) => [...outlets, outlet]);

    return () => this.outlets.update((outlets) => outlets.filter((item) => item !== outlet));
  }

  private startTimer(id: number): void {
    const timer = this.timers.get(id);
    if (!timer) {
      return;
    }

    timer.startedAt = Date.now();
    timer.handle = setTimeout(() => this.dismiss(id), timer.remaining);
  }

  private clearTimer(id: number): void {
    clearTimeout(this.timers.get(id)?.handle);
    this.timers.delete(id);
  }
}
