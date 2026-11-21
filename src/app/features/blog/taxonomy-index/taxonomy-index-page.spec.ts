import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { API_URL } from '../../../core/api';
import { TaxonomyKind } from '../blog-api';
import { TaxonomyIndexPage, postsCountLabel } from './taxonomy-index-page';

const API = 'http://api.test/api';

function render(kind: TaxonomyKind) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
    ],
  });
  const fixture = TestBed.createComponent(TaxonomyIndexPage);
  fixture.componentRef.setInput('kind', kind);
  fixture.detectChanges();

  return {
    fixture,
    http: TestBed.inject(HttpTestingController),
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('postsCountLabel', () => {
  it('pluralizes the number of posts', () => {
    expect(postsCountLabel(1)).toBe('1 post');
    expect(postsCountLabel(3)).toBe('3 posts');
    expect(postsCountLabel(undefined)).toBe('0 posts');
  });
});

describe('TaxonomyIndexPage', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lists categories with description and number of posts', async () => {
    const { fixture, http, element } = render('categories');

    http.expectOne(`${API}/categories`).flush({
      data: [
        { id: 1, name: 'Back-end', slug: 'back-end', description: 'APIs e bancos', posts_count: 3 },
        { id: 2, name: 'Carreira', slug: 'carreira', description: null, posts_count: 1 },
      ],
    });
    await fixture.whenStable();

    expect(element.querySelector('h1')?.textContent).toBe('Categorias');
    const cards = element.querySelectorAll<HTMLAnchorElement>('a.category-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].getAttribute('href')).toBe('/categorias/back-end');
    expect(cards[0].querySelector('h2')?.textContent).toBe('Back-end');
    expect(cards[0].textContent).toContain('APIs e bancos');
    expect(cards[0].textContent).toContain('3 posts');
    expect(cards[1].querySelector('.category-card__description')).toBeNull();
    expect(cards[1].textContent).toContain('1 post');
    expect(TestBed.inject(Title).getTitle()).toContain('Categorias');
  });

  it('lists tags as chips with the number of posts', async () => {
    const { fixture, http, element } = render('tags');

    http.expectOne(`${API}/tags`).flush({
      data: [
        { id: 1, name: 'angular', slug: 'angular', posts_count: 2 },
        { id: 2, name: 'php', slug: 'php', posts_count: 1 },
      ],
    });
    await fixture.whenStable();

    expect(element.querySelector('h1')?.textContent).toBe('Tags');
    const chips = element.querySelectorAll<HTMLAnchorElement>('a.chip');
    expect(chips).toHaveLength(2);
    expect(chips[0].getAttribute('href')).toBe('/tags/angular');
    expect(chips[0].getAttribute('aria-label')).toBe('#angular, 2 posts');
    expect(chips[1].textContent).toContain('#php');
    expect(TestBed.inject(Title).getTitle()).toContain('Tags');
  });

  it('shows an empty state when nothing has published posts', async () => {
    const { fixture, http, element } = render('tags');

    http.expectOne(`${API}/tags`).flush({ data: [] });
    await fixture.whenStable();

    expect(element.querySelector('.state')?.textContent).toContain(
      'Nenhuma tag com posts publicados ainda.',
    );
  });

  it('offers to retry when the list cannot be loaded', async () => {
    const { fixture, http, element } = render('categories');

    http
      .expectOne(`${API}/categories`)
      .flush({}, { status: 500, statusText: 'Internal Server Error' });
    await fixture.whenStable();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível carregar categorias.',
    );
    element.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    fixture.detectChanges();
    http.expectOne(`${API}/categories`).flush({ data: [] });
    await fixture.whenStable();

    expect(element.querySelector('.state')?.textContent).toContain(
      'Nenhuma categoria com posts publicados ainda.',
    );
  });
});
