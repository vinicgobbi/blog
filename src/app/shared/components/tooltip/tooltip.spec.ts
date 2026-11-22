import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Tooltip } from './tooltip';

@Component({
  imports: [Tooltip],
  template: `<button type="button" [appTooltip]="text()" [appTooltipDisabled]="disabled()">
    <span class="visually-hidden">{{ text() }}</span>
  </button>`,
})
class Host {
  readonly text = signal('Categorias');
  readonly disabled = signal(false);
}

async function render() {
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
  vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
    top: 100,
    height: 40,
    right: 72,
  } as DOMRect);

  return { fixture, button };
}

function tooltip(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('.tooltip');
}

describe('Tooltip', () => {
  afterEach(() => tooltip()?.remove());

  it('shows the text next to the element on hover and hides it on leave', async () => {
    const { button } = await render();

    button.dispatchEvent(new MouseEvent('mouseenter'));

    expect(tooltip()?.textContent).toBe('Categorias');
    expect(tooltip()?.getAttribute('aria-hidden')).toBe('true');
    expect(tooltip()?.style.top).toBe('120px');
    expect(tooltip()?.style.left).toBe('82px');

    button.dispatchEvent(new MouseEvent('mouseleave'));

    expect(tooltip()).toBeNull();
  });

  it('shows on keyboard focus and closes with Escape', async () => {
    const { button } = await render();

    button.dispatchEvent(new FocusEvent('focusin'));
    expect(tooltip()).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(tooltip()).toBeNull();
  });

  it('does not show while disabled and hides when it becomes disabled', async () => {
    const { fixture, button } = await render();
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    button.dispatchEvent(new MouseEvent('mouseenter'));
    expect(tooltip()).toBeNull();

    fixture.componentInstance.disabled.set(false);
    await fixture.whenStable();
    button.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect(tooltip()).toBeNull();
  });

  it('removes the tooltip when the element is destroyed', async () => {
    const { fixture, button } = await render();
    button.dispatchEvent(new MouseEvent('mouseenter'));

    fixture.destroy();

    expect(tooltip()).toBeNull();
  });
});
