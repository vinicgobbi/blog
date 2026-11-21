import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_URL } from '../../../core/api';
import { PaginatedResponse } from '../../../shared/models/api';
import { AdminPost } from '../../../shared/models/admin';
import { PostListPage } from './post-list-page';

registerLocaleData(localePt, 'pt-BR');

const API = 'http://api.test/api';

function page(posts: Partial<AdminPost>[]): PaginatedResponse<AdminPost> {
  return {
    data: posts.map((post, index) => ({
      id: index + 1,
      title: `Post ${index + 1}`,
      slug: `post-${index + 1}`,
      excerpt: null,
      cover_image_path: null,
      cover_image_url: null,
      status: 'draft',
      state: 'draft',
      published_at: null,
      reading_time: 1,
      author: { id: 1, name: 'Admin' },
      category: null,
      tags: [],
      created_at: '2026-11-20T10:00:00-03:00',
      updated_at: '2026-11-20T10:00:00-03:00',
      ...post,
    })),
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: 1,
      from: 1,
      last_page: 1,
      per_page: 20,
      to: posts.length,
      total: posts.length,
    },
  };
}

function render(state?: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
      { provide: LOCALE_ID, useValue: 'pt-BR' },
    ],
  });
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(PostListPage);
  if (state) {
    fixture.componentRef.setInput('state', state);
  }
  fixture.detectChanges();

  return {
    fixture,
    router,
    http: TestBed.inject(HttpTestingController),
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('PostListPage', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
  });

  it('lists posts with their state and links to the editor', async () => {
    const { fixture, http, element } = render();

    http.expectOne(`${API}/admin/posts`).flush(
      page([
        {
          title: 'Publicado',
          state: 'published',
          status: 'published',
          published_at: '2026-11-20T10:00:00-03:00',
        },
        { title: 'Rascunho', state: 'draft' },
      ]),
    );
    await fixture.whenStable();

    const rows = element.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector('.badge')?.textContent?.trim()).toBe('Publicado');
    expect(rows[1].querySelector('.badge')?.textContent?.trim()).toBe('Rascunho');
    expect(rows[0].querySelector('a.table__title')?.getAttribute('href')).toBe('/admin/posts/1');
    expect(rows[0].querySelector('a[href="/posts/post-1"]')).not.toBeNull();
    expect(rows[1].querySelector('a[href="/posts/post-2"]')).toBeNull();
  });

  it('filters by state through the URL, ignoring unknown values', async () => {
    const { fixture, http, element, router } = render('scheduled');
    http.expectOne(`${API}/admin/posts?state=scheduled`).flush(page([]));
    await fixture.whenStable();

    [...element.querySelectorAll<HTMLButtonElement>('.filters__states button')]
      .find((b) => b.textContent?.includes('Rascunho'))!
      .click();

    expect(router.navigate).toHaveBeenCalledWith([], {
      queryParams: { state: 'draft', page: null },
      queryParamsHandling: 'merge',
    });
  });

  it('moves a post to the trash after confirmation and reloads the list', async () => {
    const { fixture, http, element } = render();
    http.expectOne(`${API}/admin/posts`).flush(page([{ title: 'Apagável' }]));
    await fixture.whenStable();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    element.querySelector<HTMLButtonElement>('button[aria-label="Excluir Apagável"]')!.click();
    http
      .expectOne({ method: 'DELETE', url: `${API}/admin/posts/1` })
      .flush(null, { status: 204, statusText: 'No Content' });

    await vi
      .waitFor(() => http.expectOne(`${API}/admin/posts`))
      .then((request) => request.flush(page([])));
  });

  it('does nothing when the deletion is not confirmed', async () => {
    const { fixture, http, element } = render();
    http.expectOne(`${API}/admin/posts`).flush(page([{ title: 'Mantido' }]));
    await fixture.whenStable();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    element.querySelector<HTMLButtonElement>('button[aria-label="Excluir Mantido"]')!.click();

    http.expectNone({ method: 'DELETE', url: `${API}/admin/posts/1` });
  });
});
