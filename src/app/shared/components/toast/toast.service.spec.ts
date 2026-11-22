import { TestBed } from '@angular/core/testing';
import { TOAST_DURATIONS, TOAST_LIMIT, ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    service.clear();
    vi.useRealTimers();
  });

  it('shows each kind of toast, newest first', () => {
    service.success('Post publicado.');
    service.error('Falhou.');
    service.warning('Atenção.');
    service.info('Dica.');

    expect(service.toasts().map(({ kind, message }) => [kind, message])).toEqual([
      ['info', 'Dica.'],
      ['warning', 'Atenção.'],
      ['error', 'Falhou.'],
      ['success', 'Post publicado.'],
    ]);
  });

  it('dismisses a toast by itself after its duration', () => {
    service.success('Post publicado.');

    vi.advanceTimersByTime(TOAST_DURATIONS.success - 1);
    expect(service.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(service.toasts()).toEqual([]);
  });

  it('keeps errors on screen longer than successes', () => {
    service.error('Falhou.');

    vi.advanceTimersByTime(TOAST_DURATIONS.success);

    expect(service.toasts()).toHaveLength(1);
    expect(TOAST_DURATIONS.error).toBeGreaterThan(TOAST_DURATIONS.success);
  });

  it('accepts a custom duration', () => {
    service.info('Rápido.', { duration: 1000 });

    vi.advanceTimersByTime(1000);

    expect(service.toasts()).toEqual([]);
  });

  it('dismisses a toast on demand', () => {
    const id = service.success('Post publicado.');
    service.error('Falhou.');

    service.dismiss(id);

    expect(service.toasts().map(({ message }) => message)).toEqual(['Falhou.']);
  });

  it('does not repeat a visible message: moves it to the top and restarts its time', () => {
    const id = service.success('Comentário aprovado.');
    service.info('Outro.');
    vi.advanceTimersByTime(TOAST_DURATIONS.success - 1000);

    expect(service.success('Comentário aprovado.')).toBe(id);
    expect(service.toasts().map(({ message }) => message)).toEqual([
      'Comentário aprovado.',
      'Outro.',
    ]);

    vi.advanceTimersByTime(TOAST_DURATIONS.success - 1);
    expect(service.toasts().map(({ message }) => message)).toEqual(['Comentário aprovado.']);
  });

  it(`keeps at most ${TOAST_LIMIT} toasts, dropping the oldest`, () => {
    for (let index = 1; index <= TOAST_LIMIT + 1; index++) {
      service.info(`Mensagem ${index}`);
    }

    expect(service.toasts()).toHaveLength(TOAST_LIMIT);
    expect(service.toasts().at(-1)?.message).toBe('Mensagem 2');
  });

  it('pauses the time while paused and resumes with what was left', () => {
    service.success('Post publicado.');
    vi.advanceTimersByTime(TOAST_DURATIONS.success - 1000);

    service.pause();
    vi.advanceTimersByTime(60_000);
    expect(service.toasts()).toHaveLength(1);

    service.resume();
    vi.advanceTimersByTime(999);
    expect(service.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(service.toasts()).toEqual([]);
  });

  it('does not start the time of a toast shown while paused', () => {
    service.success('Primeiro.');
    service.pause();
    service.success('Segundo.');

    vi.advanceTimersByTime(60_000);
    expect(service.toasts()).toHaveLength(2);

    service.resume();
    vi.advanceTimersByTime(TOAST_DURATIONS.success);
    expect(service.toasts()).toEqual([]);
  });

  it('starts counting again once every toast is gone, even if it was paused', () => {
    const id = service.success('Primeiro.');
    service.pause();
    service.dismiss(id);

    service.success('Segundo.');
    vi.advanceTimersByTime(TOAST_DURATIONS.success);

    expect(service.toasts()).toEqual([]);
  });

  it('makes the last registered outlet the active one', () => {
    const root = {};
    const dialog = {};
    service.registerOutlet(root);
    const unregister = service.registerOutlet(dialog);

    expect(service.activeOutlet()).toBe(dialog);

    unregister();
    expect(service.activeOutlet()).toBe(root);
  });
});
