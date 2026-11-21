import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { postsPage } from '../../../../testing/blog-fixtures';
import { API_URL } from '../../../core/api';
import { TagPage } from './tag-page';

const API = 'http://api.test/api';

function render(slug = 'php', page?: number) {
  const response: ResponseInit = {};
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
      { provide: RESPONSE_INIT, useValue: response },
    ],
  });
  const fixture = TestBed.createComponent(TagPage);
  fixture.componentRef.setInput('slug', slug);
  if (page) {
    fixture.componentRef.setInput('page', page);
  }
  fixture.detectChanges();

  return {
    fixture,
    response,
    http: TestBed.inject(HttpTestingController),
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('TagPage', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('shows the tag, its posts and a link to the tag RSS feed', async () => {
    const { fixture, http, element } = render('php', 2);

    http
      .expectOne(`${API}/tags/php`)
      .flush({ data: { id: 1, name: 'PHP', slug: 'php', posts_count: 12 } });
    http
      .expectOne(`${API}/posts?page=2&tag=php`)
      .flush(postsPage([{ title: 'Sobre PHP' }], { current_page: 2, last_page: 2 }));
    await fixture.whenStable();

    expect(element.querySelector('h1')?.textContent).toBe('#PHP');
    expect(element.querySelector('.section-subtitle')?.textContent).toContain(
      '12 posts publicados',
    );
    expect(element.querySelector('app-post-card h2')?.textContent?.trim()).toBe('Sobre PHP');
    expect(element.querySelector('a.feed-link')?.getAttribute('href')).toBe(
      `${environment.feedUrl}/tags/php`,
    );
    expect(TestBed.inject(Title).getTitle()).toContain('#PHP');
  });

  it('answers 404 for an unknown tag', async () => {
    const { fixture, http, element, response } = render('nao-existe');

    http.expectOne(`${API}/tags/nao-existe`).flush({}, { status: 404, statusText: 'Not Found' });
    http.expectOne(`${API}/posts?tag=nao-existe`).flush(postsPage());
    await fixture.whenStable();

    expect(element.querySelector('h1')?.textContent).toBe('Tag não encontrada');
    expect(response.status).toBe(404);
  });
});
