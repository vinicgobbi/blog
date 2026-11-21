import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { API_URL } from '../../../core/api';
import { StaticPageComponent } from './static-page';

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
  const fixture = TestBed.createComponent(StaticPageComponent);
  fixture.componentRef.setInput('slug', slug);
  fixture.detectChanges();

  return {
    fixture,
    response,
    http: TestBed.inject(HttpTestingController),
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('StaticPageComponent', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('renders the page title and Markdown content with heading anchors', async () => {
    const { fixture, http, element } = render('sobre');

    http.expectOne(`${API}/pages/sobre`).flush({
      data: {
        id: 1,
        title: 'Sobre',
        slug: 'sobre',
        body_html:
          '<h2>Quem sou<a class="heading-permalink" href="#secao-quem-sou">#</a></h2><p>Olá!</p>',
        updated_at: '2026-11-20T10:00:00-03:00',
      },
    });
    await fixture.whenStable();

    expect(element.querySelector('h1')?.textContent).toBe('Sobre');
    expect(element.querySelector('.prose p')?.textContent).toBe('Olá!');
    expect(element.querySelector('.prose h2')?.id).toBe('secao-quem-sou');
    expect(TestBed.inject(Title).getTitle()).toContain('Sobre');
  });

  it('answers 404 for an unknown or unpublished page', async () => {
    const { fixture, http, element, response } = render('rascunho');

    http.expectOne(`${API}/pages/rascunho`).flush({}, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(element.querySelector('h1')?.textContent).toBe('Página não encontrada');
    expect(response.status).toBe(404);
  });
});
