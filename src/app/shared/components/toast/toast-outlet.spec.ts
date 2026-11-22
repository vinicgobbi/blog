import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ToastOutlet } from './toast-outlet';
import { ToastService } from './toast.service';

@Component({
  imports: [ToastOutlet],
  template: `
    <app-toast-outlet id="raiz" />
    @if (dialogOpen()) {
      <app-toast-outlet id="dialogo" />
    }
  `,
})
class Host {
  readonly dialogOpen = signal(false);
}

async function render() {
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const service = TestBed.inject(ToastService);

  return { fixture, element, service };
}

function toastsIn(element: HTMLElement): HTMLElement[] {
  return Array.from(element.querySelectorAll<HTMLElement>('.toast'));
}

describe('ToastOutlet', () => {
  afterEach(() => {
    TestBed.inject(ToastService).clear();
    vi.useRealTimers();
  });

  it('renders a toast with the icon and a screen reader label for its kind', async () => {
    const { fixture, element, service } = await render();

    service.success('Post publicado.');
    await fixture.whenStable();

    const [toast] = toastsIn(element);
    expect(toast.classList).toContain('toast--success');
    expect(toast.querySelector('.bi-check-circle-fill')).not.toBeNull();
    expect(toast.textContent).toContain('Sucesso:');
    expect(toast.textContent).toContain('Post publicado.');
  });

  it('announces errors assertively and the other kinds politely', async () => {
    const { fixture, element, service } = await render();

    service.error('Falhou.');
    service.warning('Atenção.');
    service.info('Dica.');
    await fixture.whenStable();

    const assertive = element.querySelector('[aria-live="assertive"]')!;
    const polite = element.querySelector('[aria-live="polite"]')!;
    expect(assertive.textContent).toContain('Falhou.');
    expect(assertive.textContent).not.toContain('Atenção.');
    expect(polite.textContent).toContain('Atenção.');
    expect(polite.textContent).toContain('Dica.');
  });

  it('closes a toast with the close button', async () => {
    const { fixture, element, service } = await render();
    service.warning('Atenção.');
    await fixture.whenStable();

    element.querySelector<HTMLButtonElement>('[aria-label="Fechar notificação"]')!.click();
    await fixture.whenStable();

    expect(service.toasts()).toEqual([]);
  });

  it('moves the focus to the next toast when one is closed from the keyboard', async () => {
    const { fixture, element, service } = await render();
    service.info('Primeiro.');
    service.info('Segundo.');
    await fixture.whenStable();

    const [newest, older] = toastsIn(element);
    newest.querySelector<HTMLButtonElement>('.toast__close')!.focus();
    newest.querySelector<HTMLButtonElement>('.toast__close')!.click();
    await fixture.whenStable();

    expect(document.activeElement).toBe(older.querySelector('.toast__close'));
  });

  it('pauses the time while the pointer is over the toasts', async () => {
    const { element, service } = await render();
    vi.useFakeTimers();
    service.success('Post publicado.');

    const outlet = element.querySelector('app-toast-outlet')!;
    outlet.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(60_000);
    expect(service.toasts()).toHaveLength(1);

    outlet.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(60_000);
    expect(service.toasts()).toEqual([]);
  });

  it('shows the toasts in the outlet of an open dialog, not behind it', async () => {
    const { fixture, element, service } = await render();
    fixture.componentInstance.dialogOpen.set(true);
    await fixture.whenStable();

    service.error('Falhou.');
    await fixture.whenStable();

    expect(toastsIn(element.querySelector('#dialogo')!)).toHaveLength(1);
    expect(toastsIn(element.querySelector('#raiz')!)).toHaveLength(0);

    fixture.componentInstance.dialogOpen.set(false);
    await fixture.whenStable();

    expect(toastsIn(element.querySelector('#raiz')!)).toHaveLength(1);
  });
});
