import { Component, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField, form } from '@angular/forms/signals';
import { DateTimePicker } from './datetime-picker';

@Component({
  imports: [DateTimePicker, FormField],
  template: `<label for="data">Data</label>
    <app-datetime-picker inputId="data" [formField]="pickerForm.date" />`,
})
class Host {
  readonly model = signal({ date: '' });
  readonly pickerForm = form(this.model);
}

async function render(date = '', { touch = false } = {}) {
  const restore = touch ? stubCoarsePointer() : () => undefined;
  TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.model.set({ date });
  await fixture.whenStable();
  restore();
  const element = fixture.nativeElement as HTMLElement;

  return { fixture, element, toggle: element.querySelector<HTMLElement>('#data')! };
}

function stubCoarsePointer(): () => void {
  const original = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({ matches: query === '(pointer: coarse)', media: query }),
  });

  return () => {
    if (original) {
      Object.defineProperty(window, 'matchMedia', original);
    } else {
      delete (window as { matchMedia?: unknown }).matchMedia;
    }
  };
}

async function open(fixture: ComponentFixture<Host>, toggle: HTMLElement): Promise<void> {
  toggle.click();
  await fixture.whenStable();
}

function day(element: HTMLElement, isoDay: string): HTMLButtonElement {
  return element.querySelector<HTMLButtonElement>(`[data-day="${isoDay}"]`)!;
}

function action(element: HTMLElement, label: string): HTMLButtonElement {
  return [...element.querySelectorAll<HTMLButtonElement>('.datetime-picker__actions button')].find(
    (button) => button.textContent?.trim() === label,
  )!;
}

function timeInput(element: HTMLElement, label: 'Hora' | 'Minutos'): HTMLInputElement {
  return element.querySelector<HTMLInputElement>(`input[aria-label^="${label}"]`)!;
}

async function key(fixture: ComponentFixture<Host>, target: Element, keyName: string) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true }));
  await fixture.whenStable();
}

describe('DateTimePicker', () => {
  it('shows a placeholder until a date is chosen', async () => {
    const { toggle } = await render();

    expect(toggle.textContent).toContain('Escolher data e hora');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('shows the chosen date in portuguese', async () => {
    const { toggle } = await render('2026-11-21T09:30');

    expect(toggle.textContent).toContain('21/11/2026 · 09:30');
  });

  it('opens on the month of the value, focusing the selected day', async () => {
    const { fixture, element, toggle } = await render('2026-11-21T09:30');

    await open(fixture, toggle);

    expect(element.querySelector('[role="dialog"] h2')?.textContent?.trim()).toBe(
      'novembro de 2026',
    );
    expect(document.activeElement).toBe(day(element, '2026-11-21'));
    expect(day(element, '2026-11-21').getAttribute('aria-pressed')).toBe('true');
    expect(day(element, '2026-11-21').getAttribute('aria-label')).toBe(
      'sábado, 21 de novembro de 2026',
    );
  });

  it('selects a day keeping the time', async () => {
    const { fixture, element, toggle } = await render('2026-11-21T14:45');
    await open(fixture, toggle);

    day(element, '2026-11-25').click();
    await fixture.whenStable();

    expect(fixture.componentInstance.model().date).toBe('2026-11-25T14:45');
  });

  it('uses 9h when choosing a day without a previous value', async () => {
    const { fixture, element, toggle } = await render();
    await open(fixture, toggle);

    const firstDay = element.querySelector<HTMLButtonElement>(
      '.datetime-picker__day:not(.datetime-picker__day--outside)',
    )!;
    firstDay.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.model().date).toBe(`${firstDay.dataset['day']}T09:00`);
  });

  it('moves the focus with the keyboard and changes month at the edges', async () => {
    const { fixture, element, toggle } = await render('2026-11-30T09:00');
    await open(fixture, toggle);

    await key(fixture, day(element, '2026-11-30'), 'ArrowRight');
    expect(document.activeElement).toBe(day(element, '2026-12-01'));
    expect(element.querySelector('[role="dialog"] h2')?.textContent?.trim()).toBe(
      'dezembro de 2026',
    );

    await key(fixture, day(element, '2026-12-01'), 'PageUp');
    expect(document.activeElement).toBe(day(element, '2026-11-01'));

    await key(fixture, day(element, '2026-11-01'), 'End');
    expect(document.activeElement).toBe(day(element, '2026-11-07'));
    expect(fixture.componentInstance.model().date).toBe('2026-11-30T09:00');

    await key(fixture, day(element, '2026-11-07'), 'ArrowDown');
    expect(document.activeElement).toBe(day(element, '2026-11-14'));
  });

  it('changes hour and minutes by typing, clamping invalid values', async () => {
    const { fixture, element, toggle } = await render('2026-11-21T09:30');
    await open(fixture, toggle);

    const hour = timeInput(element, 'Hora');
    hour.value = '17';
    hour.dispatchEvent(new Event('change'));
    const minutes = timeInput(element, 'Minutos');
    minutes.value = '75';
    minutes.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(fixture.componentInstance.model().date).toBe('2026-11-21T17:59');
  });

  it('steps hour and minutes with the arrow keys, wrapping around', async () => {
    const { fixture, element, toggle } = await render('2026-11-21T23:00');
    await open(fixture, toggle);

    await key(fixture, timeInput(element, 'Hora'), 'ArrowUp');
    await key(fixture, timeInput(element, 'Minutos'), 'ArrowDown');

    expect(fixture.componentInstance.model().date).toBe('2026-11-21T00:59');
  });

  it('offers shortcuts for tomorrow morning and clearing the date', async () => {
    const { fixture, element, toggle } = await render();
    await open(fixture, toggle);

    action(element, 'Amanhã às 9h').click();
    await fixture.whenStable();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pad = (value: number) => String(value).padStart(2, '0');
    expect(fixture.componentInstance.model().date).toBe(
      `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T09:00`,
    );

    action(element, 'Limpar').click();
    await fixture.whenStable();

    expect(fixture.componentInstance.model().date).toBe('');
    expect(element.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });

  it('closes with Escape, returning the focus and marking the field as touched', async () => {
    const { fixture, element, toggle } = await render('2026-11-21T09:30');
    await open(fixture, toggle);

    await key(fixture, day(element, '2026-11-21'), 'Escape');

    expect(element.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(toggle);
    expect(fixture.componentInstance.pickerForm.date().touched()).toBe(true);
  });

  it('closes when clicking outside', async () => {
    const { fixture, element, toggle } = await render();
    await open(fixture, toggle);

    document.body.click();
    await fixture.whenStable();

    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });

  it('uses the native picker on touch screens', async () => {
    const { fixture, element } = await render('2026-11-21T09:30', { touch: true });
    const input = element.querySelector<HTMLInputElement>('#data')!;

    expect(input.type).toBe('datetime-local');
    expect(input.value).toBe('2026-11-21T09:30');

    input.value = '2026-12-01T08:00';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(fixture.componentInstance.model().date).toBe('2026-12-01T08:00');
    expect(element.querySelector('.datetime-picker__toggle')).toBeNull();
  });
});
