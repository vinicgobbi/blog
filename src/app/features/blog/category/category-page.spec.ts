import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { postsPage } from '../../../../testing/blog-fixtures';
import { API_URL } from '../../../core/api';
import { CategoryPage } from './category-page';

const API = 'http://api.test/api';

function render(slug: string) {
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
  const fixture = TestBed.createComponent(CategoryPage);
  fixture.componentRef.setInput('slug', slug);
  fixture.detectChanges();

  return {
    fixture,
    response,
    http: TestBed.inject(HttpTestingController),
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('CategoryPage', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('shows the category with description, its posts and announces its feed', async () => {
    const { fixture, http, element } = render('laravel');

    http.expectOne(`${API}/categories/laravel`).flush({
      data: { id: 1, name: 'Laravel', slug: 'laravel', description: 'Tudo sobre Laravel' },
    });
    http.expectOne(`${API}/posts?category=laravel`).flush(postsPage([{}, {}]));
    await fixture.whenStable();

    expect(element.querySelector('h1')?.textContent).toBe('Laravel');
    expect(element.querySelector('.section-subtitle')?.textContent).toBe('Tudo sobre Laravel');
    expect(element.querySelectorAll('app-post-card')).toHaveLength(2);
    expect(TestBed.inject(Meta).getTag('name="description"')?.content).toBe('Tudo sobre Laravel');
    expect(
      document.head
        .querySelector('link[rel="alternate"][type="application/rss+xml"]')
        ?.getAttribute('href'),
    ).toBe(`${environment.feedUrl}/categories/laravel`);
  });

  it('answers 404 for an unknown category', async () => {
    const { fixture, http, element, response } = render('nao-existe');

    http
      .expectOne(`${API}/categories/nao-existe`)
      .flush({}, { status: 404, statusText: 'Not Found' });
    http.expectOne(`${API}/posts?category=nao-existe`).flush(postsPage());
    await fixture.whenStable();

    expect(element.querySelector('h1')?.textContent).toBe('Categoria não encontrada');
    expect(response.status).toBe(404);
  });
});
