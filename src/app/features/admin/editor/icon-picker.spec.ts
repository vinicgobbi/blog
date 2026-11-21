import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField, form, required } from '@angular/forms/signals';
import { IconPicker } from './icon-picker';
import { SUGGESTED_ICONS } from './icon-names';

@Component({
  imports: [IconPicker, FormField],
  template: `<app-icon-picker inputId="icone" [formField]="pickerForm.icon" />`,
})
class Host {
  readonly model = signal({ icon: '' });
  readonly pickerForm = form(this.model, (path) => required(path.icon));
}

async function render(icon = '') {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.model.set({ icon });
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;

  return { fixture, element, toggle: element.querySelector<HTMLButtonElement>('#icone')! };
}

async function open(fixture: ComponentFixture<Host>, toggle: HTMLButtonElement): Promise<void> {
  toggle.click();
  await fixture.whenStable();
}

async function search(fixture: ComponentFixture<Host>, element: HTMLElement, query: string) {
  const input = element.querySelector<HTMLInputElement>('input[type="search"]')!;
  input.value = query;
  input.dispatchEvent(new Event('input'));
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(element.querySelector('.icon-picker__state')).toBeNull();
  });
}

function options(element: HTMLElement): string[] {
  return [...element.querySelectorAll('.icon-picker__option')].map(
    (option) => option.getAttribute('aria-label') ?? '',
  );
}

describe('IconPicker', () => {
  it('shows a placeholder until an icon is chosen', async () => {
    const { element, toggle } = await render();

    expect(toggle.textContent).toContain('Escolher ícone');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('.icon-picker__panel')).toBeNull();
  });

  it('shows the selected icon', async () => {
    const { toggle } = await render('envelope');

    expect(toggle.querySelector('i.bi-envelope')).not.toBeNull();
    expect(toggle.textContent).toContain('envelope');
  });

  it('opens with the suggestions and focuses the search', async () => {
    const { fixture, element, toggle } = await render();

    await open(fixture, toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(options(element)).toEqual(SUGGESTED_ICONS);
    expect(document.activeElement).toBe(element.querySelector('input[type="search"]'));
  });

  it('searches all icons and selects one, closing the panel', async () => {
    const { fixture, element, toggle } = await render();
    await open(fixture, toggle);

    await search(fixture, element, 'house door');
    expect(options(element)).toContain('house-door-fill');
    expect(options(element).every((name) => name.includes('house') && name.includes('door'))).toBe(
      true,
    );

    element.querySelector<HTMLButtonElement>('[aria-label="house-door"]')!.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.model().icon).toBe('house-door');
    expect(fixture.componentInstance.pickerForm.icon().touched()).toBe(true);
    expect(element.querySelector('.icon-picker__panel')).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });

  it('marks the current icon as pressed', async () => {
    const { fixture, element, toggle } = await render('person');
    await open(fixture, toggle);

    const selected = element.querySelectorAll('.icon-picker__option[aria-pressed="true"]');
    expect(selected).toHaveLength(1);
    expect(selected[0].getAttribute('aria-label')).toBe('person');
  });

  it('tells when nothing matches the search', async () => {
    const { fixture, element, toggle } = await render();
    await open(fixture, toggle);

    await search(fixture, element, 'nenhum-icone-assim');

    expect(options(element)).toEqual([]);
    expect(element.querySelector('.icon-picker__hint')?.textContent).toContain(
      'Nenhum ícone encontrado.',
    );
  });

  it('closes with Escape or a click outside, marking the field as touched', async () => {
    const { fixture, element, toggle } = await render();

    await open(fixture, toggle);
    element
      .querySelector('input[type="search"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(element.querySelector('.icon-picker__panel')).toBeNull();
    expect(fixture.componentInstance.pickerForm.icon().touched()).toBe(true);
    expect(toggle.getAttribute('aria-invalid')).toBe('true');

    await open(fixture, toggle);
    document.body.click();
    await fixture.whenStable();
    expect(element.querySelector('.icon-picker__panel')).toBeNull();
  });
});
