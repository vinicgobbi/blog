import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Tooltip } from './tooltip';
import { TOOLTIP_SHOW_DELAY, TOOLTIP_TRAVEL_WINDOW } from './tooltip-layer';

@Component({
  imports: [Tooltip],
  template: `
    <button type="button" id="categorias" appTooltip="Categorias" [appTooltipDisabled]="disabled()">
      <span class="visually-hidden">Categorias</span>
    </button>
    <button type="button" id="tags" appTooltip="Tags" [appTooltipDisabled]="disabled()">
      <span class="visually-hidden">Tags</span>
    </button>
  `,
})
class Host {
  readonly disabled = signal(false);
}

async function render() {
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const categories = element.querySelector<HTMLButtonElement>('#categorias')!;
  const tags = element.querySelector<HTMLButtonElement>('#tags')!;
  vi.spyOn(categories, 'getBoundingClientRect').mockReturnValue({
    top: 100,
    height: 40,
    right: 72,
  } as DOMRect);
  vi.spyOn(tags, 'getBoundingClientRect').mockReturnValue({
    top: 140,
    height: 40,
    right: 72,
  } as DOMRect);

  return { fixture, categories, tags };
}

function tooltip(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('.tooltip');
}

function visibleTooltip(): HTMLElement | null {
  const element = tooltip();

  return element && !element.classList.contains('tooltip--hidden') ? element : null;
}

describe('Tooltip', () => {
  afterEach(() => {
    vi.useRealTimers();
    tooltip()?.remove();
  });

  it('waits a moment on hover before showing, next to the element', async () => {
    const { categories } = await render();
    vi.useFakeTimers();

    categories.dispatchEvent(new MouseEvent('mouseenter'));
    expect(tooltip()).toBeNull();

    vi.advanceTimersByTime(TOOLTIP_SHOW_DELAY);

    expect(visibleTooltip()?.textContent).toBe('Categorias');
    expect(tooltip()?.getAttribute('aria-hidden')).toBe('true');
    expect(tooltip()?.style.top).toBe('120px');
    expect(tooltip()?.style.left).toBe('82px');
  });

  it('does not show when the mouse leaves before the delay', async () => {
    const { categories } = await render();
    vi.useFakeTimers();

    categories.dispatchEvent(new MouseEvent('mouseenter'));
    categories.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(TOOLTIP_SHOW_DELAY);

    expect(tooltip()).toBeNull();
  });

  it('hides instantly and travels to a neighbour hovered right after', async () => {
    const { categories, tags } = await render();
    vi.useFakeTimers();
    categories.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(TOOLTIP_SHOW_DELAY);
    const shown = tooltip();

    categories.dispatchEvent(new MouseEvent('mouseleave'));
    expect(visibleTooltip()).toBeNull();

    tags.dispatchEvent(new MouseEvent('mouseenter'));

    expect(visibleTooltip()?.textContent).toBe('Tags');
    expect(tooltip()).toBe(shown);
    expect(tooltip()?.style.top).toBe('160px');
  });

  it('removes the hidden tooltip once the travel window ends', async () => {
    const { categories, tags } = await render();
    vi.useFakeTimers();
    categories.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(TOOLTIP_SHOW_DELAY);

    categories.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(TOOLTIP_TRAVEL_WINDOW);
    expect(tooltip()).toBeNull();

    tags.dispatchEvent(new MouseEvent('mouseenter'));
    expect(tooltip()).toBeNull();
  });

  it('shows at once on keyboard focus and closes with Escape', async () => {
    const { categories } = await render();

    categories.dispatchEvent(new FocusEvent('focusin'));
    expect(visibleTooltip()?.textContent).toBe('Categorias');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(tooltip()).toBeNull();
  });

  it('does not show while disabled and goes away when it becomes disabled', async () => {
    const { fixture, categories } = await render();
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    categories.dispatchEvent(new FocusEvent('focusin'));
    expect(tooltip()).toBeNull();

    fixture.componentInstance.disabled.set(false);
    await fixture.whenStable();
    categories.dispatchEvent(new FocusEvent('focusin'));
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect(tooltip()).toBeNull();
  });

  it('removes the tooltip when the element is destroyed', async () => {
    const { fixture, categories } = await render();
    categories.dispatchEvent(new FocusEvent('focusin'));

    fixture.destroy();

    expect(tooltip()).toBeNull();
  });
});
