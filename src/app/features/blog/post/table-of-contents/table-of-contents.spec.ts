import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArticleSection } from '../article-html';
import { ACTIVE_SECTION_OFFSET, TableOfContents } from './table-of-contents';

const SECTIONS: ArticleSection[] = [
  { id: 'secao-intro', title: 'Introdução' },
  { id: 'secao-uso', title: 'Uso' },
  { id: 'secao-fim', title: 'Conclusão' },
];

@Component({
  imports: [TableOfContents],
  template: `
    <app-table-of-contents [sections]="sections()" />
    @for (section of sections(); track section.id) {
      <h2 [id]="section.id">{{ section.title }}</h2>
    }
  `,
})
class Host {
  readonly sections = signal(SECTIONS);
}

/** Topo de cada título na tela, por id (o jsdom não calcula layout). */
let headingTops: Record<string, number> = {};

async function render(
  tops: Record<string, number> = { 'secao-intro': 400, 'secao-uso': 900, 'secao-fim': 1400 },
) {
  headingTops = tops;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    return { top: headingTops[this.id] ?? 0 } as DOMRect;
  });
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();

  return { fixture, element: fixture.nativeElement as HTMLElement };
}

/**
 * Rola a página. O requestAnimationFrame vira um setTimeout: no jsdom ele só
 * funciona em algumas configurações (no CI nunca disparava e o teste estourava
 * o tempo), e precisa continuar assíncrono, porque o Angular também o usa para
 * agendar a detecção de mudanças.
 */
async function scroll(fixture: { whenStable(): Promise<unknown> }): Promise<void> {
  vi.spyOn(document.defaultView!, 'requestAnimationFrame').mockImplementation(
    (callback) => setTimeout(() => callback(performance.now())) as unknown as number,
  );
  document.defaultView!.dispatchEvent(new Event('scroll'));
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
}

function activeLink(element: HTMLElement): string | null | undefined {
  return element.querySelector('a[aria-current="location"]')?.textContent?.trim();
}

describe('TableOfContents', () => {
  afterEach(() => vi.restoreAllMocks());

  it('links each section to its heading anchor', async () => {
    const { element } = await render();

    const links = [...element.querySelectorAll<HTMLAnchorElement>('.toc__link')];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '#secao-intro',
      '#secao-uso',
      '#secao-fim',
    ]);
    expect(element.querySelector('nav')?.getAttribute('aria-labelledby')).toBe('sumario-titulo');
  });

  it('highlights no section before the first heading is reached', async () => {
    const { element } = await render();

    expect(activeLink(element)).toBeUndefined();
  });

  it('highlights the last heading that passed the top of the screen while scrolling', async () => {
    const { fixture, element } = await render();

    headingTops = {
      'secao-intro': -300,
      'secao-uso': ACTIVE_SECTION_OFFSET - 10,
      'secao-fim': 700,
    };
    await scroll(fixture);

    expect(activeLink(element)).toBe('Uso');
    expect(element.querySelectorAll('.toc__link.active')).toHaveLength(1);
  });

  it('keeps following the reading on later scrolls', async () => {
    const { fixture, element } = await render();

    headingTops = { 'secao-intro': 50, 'secao-uso': 600, 'secao-fim': 1100 };
    await scroll(fixture);
    expect(activeLink(element)).toBe('Introdução');

    headingTops = { 'secao-intro': -900, 'secao-uso': -400, 'secao-fim': 80 };
    await scroll(fixture);
    expect(activeLink(element)).toBe('Conclusão');
  });

  it('opens and closes the list on small screens', async () => {
    const { fixture, element } = await render();
    const toggle = element.querySelector<HTMLButtonElement>('.toc__toggle')!;

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await fixture.whenStable();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent?.trim()).toBe('Ocultar');
    expect(element.querySelector('nav')?.classList).toContain('toc--open');
  });
});
