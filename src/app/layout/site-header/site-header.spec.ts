import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_URL } from '../../core/api';
import { SiteHeader } from './site-header';

const API = 'http://api.test/api';

function render() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
    ],
  });
  const fixture = TestBed.createComponent(SiteHeader);
  fixture.detectChanges();

  return {
    fixture,
    http: TestBed.inject(HttpTestingController),
    element: fixture.nativeElement as HTMLElement,
  };
}

function navLinks(element: HTMLElement): { href: string | null; label: string | null }[] {
  return [...element.querySelectorAll<HTMLAnchorElement>('.nav-links a')].map((link) => ({
    href: link.getAttribute('href'),
    label: link.getAttribute('aria-label'),
  }));
}

describe('SiteHeader', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lists the default links and the published pages with their icons', async () => {
    const { fixture, http, element } = render();

    http.expectOne(`${API}/pages`).flush({
      data: [
        { id: 1, title: 'Sobre', slug: 'sobre', icon: 'person' },
        { id: 2, title: 'Projetos', slug: 'projetos', icon: 'code-slash' },
      ],
    });
    await fixture.whenStable();

    expect(navLinks(element).map((link) => link.label)).toEqual([
      'Início',
      'Categorias',
      'Tags',
      'Sobre',
      'Projetos',
      'Buscar posts',
      'Feed RSS',
    ]);
    expect(navLinks(element)[1].href).toBe('/categorias');
    expect(navLinks(element)[2].href).toBe('/tags');
    expect(navLinks(element)[4].href).toBe('/projetos');
    expect(element.querySelector('a[href="/sobre"] i.bi-person')).not.toBeNull();
    expect(element.querySelector('a[href="/projetos"] i.bi-code-slash')).not.toBeNull();
  });

  it('does not link to "Sobre" while that page is not published', async () => {
    const { fixture, http, element } = render();

    http.expectOne(`${API}/pages`).flush({ data: [] });
    await fixture.whenStable();

    expect(element.querySelector('a[href="/sobre"]')).toBeNull();
    expect(navLinks(element)).toHaveLength(5);
  });

  it('keeps the default links when the pages cannot be loaded', async () => {
    const { fixture, http, element } = render();

    http.expectOne(`${API}/pages`).flush({}, { status: 500, statusText: 'Internal Server Error' });
    await fixture.whenStable();

    expect(navLinks(element).map((link) => link.label)).toEqual([
      'Início',
      'Categorias',
      'Tags',
      'Buscar posts',
      'Feed RSS',
    ]);
  });
});
