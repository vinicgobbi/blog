import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { postsPage } from '../../../../testing/blog-fixtures';
import { API_URL } from '../../../core/api';
import { SearchPage } from './search-page';

const API = 'http://api.test/api';

function render(q?: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
    ],
  });
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(SearchPage);
  if (q !== undefined) {
    fixture.componentRef.setInput('q', q);
  }
  fixture.detectChanges();

  return {
    fixture,
    router,
    http: TestBed.inject(HttpTestingController),
    element: fixture.nativeElement as HTMLElement,
  };
}

function typeTerm(element: HTMLElement, value: string): void {
  const input = element.querySelector<HTMLInputElement>('#busca-termo')!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('SearchPage', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('does not search without a term and explains how to search', async () => {
    const { fixture, element } = render();
    await fixture.whenStable();

    expect(element.textContent).toContain('Digite um termo para buscar');
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe('noindex, follow');
  });

  it('searches the term from the URL and shows the result count', async () => {
    const { fixture, http, element } = render('angular');

    http.expectOne(`${API}/posts?q=angular`).flush(postsPage([{ title: 'Aprendendo Angular' }]));
    await fixture.whenStable();

    expect(element.querySelector<HTMLInputElement>('#busca-termo')?.value).toBe('angular');
    expect(element.querySelector('[role="status"]')?.textContent).toContain('1 resultado');
    expect(element.querySelector('app-post-card h2')?.textContent?.trim()).toBe(
      'Aprendendo Angular',
    );
  });

  it('navigates to the search URL with the trimmed term on submit', async () => {
    const { fixture, router, element } = render();
    typeTerm(element, '  laravel  ');
    await fixture.whenStable();

    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(router.navigate).toHaveBeenCalledWith(['/busca'], { queryParams: { q: 'laravel' } });
  });

  it('blocks terms longer than the API limit', async () => {
    const { fixture, router, element } = render();
    typeTerm(element, 'a'.repeat(101));
    await fixture.whenStable();

    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();

    expect(router.navigate).not.toHaveBeenCalled();
    expect(element.querySelector('#busca-erro')?.textContent).toContain('no máximo 100 caracteres');
  });
});
