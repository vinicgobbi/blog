import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_URL } from '../../core/api';
import { stubWideScreen } from '../../../testing/wide-screen';
import { SiteSidebar } from './site-sidebar';

const API = 'http://api.test/api';

@Component({ template: '' })
class EmptyPage {}

function render() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', component: EmptyPage }]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
    ],
  });
  const fixture = TestBed.createComponent(SiteSidebar);
  fixture.detectChanges();

  return {
    fixture,
    http: TestBed.inject(HttpTestingController),
    element: fixture.nativeElement as HTMLElement,
  };
}

function navLinks(element: HTMLElement): { href: string | null; label: string }[] {
  return [...element.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Principal"] a')].map(
    (link) => ({ href: link.getAttribute('href'), label: link.textContent?.trim() ?? '' }),
  );
}

function menuToggle(element: HTMLElement): HTMLButtonElement {
  return element.querySelector<HTMLButtonElement>('button[aria-controls="menu-lateral-blog"]')!;
}

describe('SiteSidebar', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
    document.documentElement.removeAttribute('data-sidebar-blog');
  });

  it('lists the default links and the published pages with their icons', async () => {
    const { fixture, http, element } = render();

    http.expectOne(`${API}/pages`).flush({
      data: [
        { id: 1, title: 'Sobre', slug: 'sobre', icon: 'person' },
        { id: 2, title: 'Projetos', slug: 'projetos', icon: 'code-slash' },
      ],
    });
    await fixture.whenStable();

    expect(navLinks(element)).toEqual([
      { href: '/', label: 'Início' },
      { href: '/categorias', label: 'Categorias' },
      { href: '/tags', label: 'Tags' },
      { href: '/sobre', label: 'Sobre' },
      { href: '/projetos', label: 'Projetos' },
    ]);
    expect(element.querySelector('ul[aria-labelledby="menu-paginas"]')?.children).toHaveLength(2);
    expect(element.querySelector('a[href="/sobre"] i.bi-person')).not.toBeNull();
    expect(element.querySelector('a[href="/projetos"] i.bi-code-slash')).not.toBeNull();
  });

  it('hides the pages section while no page is published', async () => {
    const { fixture, http, element } = render();

    http.expectOne(`${API}/pages`).flush({ data: [] });
    await fixture.whenStable();

    expect(element.querySelector('a[href="/sobre"]')).toBeNull();
    expect(element.querySelector('#menu-paginas')).toBeNull();
    expect(navLinks(element)).toHaveLength(3);
  });

  it('keeps the default links when the pages cannot be loaded', async () => {
    const { fixture, http, element } = render();

    http.expectOne(`${API}/pages`).flush({}, { status: 500, statusText: 'Internal Server Error' });
    await fixture.whenStable();

    expect(navLinks(element).map((link) => link.label)).toEqual(['Início', 'Categorias', 'Tags']);
  });

  it('keeps "Início" active while searching or paginating the home page', async () => {
    const { fixture, http, element } = render();
    http.expectOne(`${API}/pages`).flush({ data: [] });

    await TestBed.inject(Router).navigateByUrl('/?q=angular&page=2');
    await fixture.whenStable();

    expect(
      element
        .querySelector('nav[aria-label="Principal"] a[href="/"]')
        ?.getAttribute('aria-current'),
    ).toBe('page');
  });

  it('opens and closes the drawer from the menu button', async () => {
    const { fixture, http, element } = render();
    http.expectOne(`${API}/pages`).flush({ data: [] });
    await fixture.whenStable();
    const toggle = menuToggle(element);

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await fixture.whenStable();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Fechar menu');
    expect(element.querySelector('#menu-lateral-blog')?.classList).toContain(
      'sidebar__panel--open',
    );

    element.querySelector<HTMLElement>('.sidebar__backdrop')!.click();
    await fixture.whenStable();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('.sidebar__backdrop')).toBeNull();
  });

  it('closes the drawer on Escape and returns the focus to the menu button', async () => {
    const { fixture, http, element } = render();
    http.expectOne(`${API}/pages`).flush({ data: [] });
    await fixture.whenStable();
    const toggle = menuToggle(element);
    toggle.click();
    await fixture.whenStable();
    // O jsdom simula uma tela larga, onde o botão fica oculto e não recebe foco de verdade.
    const focus = vi.spyOn(toggle, 'focus');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(focus).toHaveBeenCalled();
  });

  it('closes the drawer after navigating', async () => {
    const { fixture, http, element } = render();
    http.expectOne(`${API}/pages`).flush({ data: [] });
    await fixture.whenStable();
    const toggle = menuToggle(element);
    toggle.click();
    await fixture.whenStable();

    await TestBed.inject(Router).navigateByUrl('/tags');
    await fixture.whenStable();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('collapses to icons and shows the label as a tooltip on focus', async () => {
    const restoreScreen = stubWideScreen();
    const { fixture, http, element } = render();
    http.expectOne(`${API}/pages`).flush({ data: [] });
    await fixture.whenStable();
    const collapse = element.querySelector<HTMLButtonElement>('.sidebar__collapse')!;
    const categories = element.querySelector<HTMLElement>('a[href="/categorias"]')!;

    categories.dispatchEvent(new FocusEvent('focusin'));
    expect(document.querySelector('.tooltip')).toBeNull();

    collapse.click();
    await fixture.whenStable();

    expect(collapse.getAttribute('aria-expanded')).toBe('false');
    expect(collapse.textContent?.trim()).toBe('Expandir menu');
    expect(document.documentElement.getAttribute('data-sidebar-blog')).toBe('collapsed');
    expect(localStorage.getItem('sidebar.blog')).toBe('collapsed');

    categories.dispatchEvent(new FocusEvent('focusin'));
    expect(document.querySelector('.tooltip')?.textContent).toBe('Categorias');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    collapse.click();
    await fixture.whenStable();
    expect(collapse.getAttribute('aria-expanded')).toBe('true');
    restoreScreen();
  });
});
