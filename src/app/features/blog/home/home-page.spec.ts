import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_URL } from '../../../core/api';
import { PaginatedResponse } from '../../../shared/models/api';
import { PostSummary } from '../../../shared/models/blog';
import { HomePage, toPageNumber } from './home-page';

const API = 'http://api.test/api';

function response(
  posts: Partial<PostSummary>[],
  currentPage = 1,
  lastPage = 1,
): PaginatedResponse<PostSummary> {
  return {
    data: posts.map((post, index) => ({
      id: index + 1,
      title: `Post ${index + 1}`,
      slug: `post-${index + 1}`,
      excerpt: null,
      cover_image_url: null,
      published_at: '2026-11-20T10:00:00-03:00',
      reading_time: 1,
      author: { name: 'Autora' },
      category: null,
      tags: [],
      ...post,
    })),
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: currentPage,
      from: 1,
      last_page: lastPage,
      per_page: 10,
      to: posts.length,
      total: posts.length,
    },
  };
}

async function render(page?: number) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
    ],
  });
  const fixture = TestBed.createComponent(HomePage);
  if (page !== undefined) {
    fixture.componentRef.setInput('page', page);
  }
  fixture.detectChanges();

  return {
    fixture,
    http: TestBed.inject(HttpTestingController),
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('toPageNumber', () => {
  it('accepts positive integers and falls back to 1', () => {
    expect(toPageNumber('3')).toBe(3);
    expect(toPageNumber(undefined)).toBe(1);
    expect(toPageNumber('0')).toBe(1);
    expect(toPageNumber('-2')).toBe(1);
    expect(toPageNumber('abc')).toBe(1);
    expect(toPageNumber('1.5')).toBe(1);
  });
});

describe('HomePage', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('requests the first page without page param and renders the posts', async () => {
    const { fixture, http, element } = await render();
    expect(element.textContent).toContain('Carregando posts…');

    http.expectOne(`${API}/posts`).flush(response([{ title: 'Primeiro' }, { title: 'Segundo' }]));
    await fixture.whenStable();

    expect(
      [...element.querySelectorAll('app-post-card h2')].map((h2) => h2.textContent?.trim()),
    ).toEqual(['Primeiro', 'Segundo']);
  });

  it('requests the page given in the URL and shows pagination', async () => {
    const { fixture, http, element } = await render(2);

    http.expectOne(`${API}/posts?page=2`).flush(response([{}], 2, 3));
    await fixture.whenStable();

    expect(element.querySelector('a[aria-current="page"]')?.textContent?.trim()).toBe('2');
  });

  it('shows an empty state when no post is published', async () => {
    const { fixture, http, element } = await render();

    http.expectOne(`${API}/posts`).flush(response([]));
    await fixture.whenStable();

    expect(element.textContent).toContain('Nenhum post publicado ainda.');
  });

  it('shows a not-found message for a page beyond the last one', async () => {
    const { fixture, http, element } = await render(99);

    http.expectOne(`${API}/posts?page=99`).flush(response([], 99, 2));
    await fixture.whenStable();

    expect(element.textContent).toContain('Esta página não existe.');
  });

  it('shows an error with a retry button that requests again', async () => {
    const { fixture, http, element } = await render();

    http.expectOne(`${API}/posts`).flush(null, { status: 500, statusText: 'Erro' });
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível carregar os posts.',
    );

    element.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    fixture.detectChanges();
    http.expectOne(`${API}/posts`).flush(response([{ title: 'Recuperado' }]));
    await fixture.whenStable();

    expect(element.querySelector('app-post-card h2')?.textContent?.trim()).toBe('Recuperado');
  });
});
