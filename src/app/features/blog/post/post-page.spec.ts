import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID, RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { API_URL } from '../../../core/api';
import { PostDetail } from '../../../shared/models/blog';
import { PostPage } from './post-page';

registerLocaleData(localePt, 'pt-BR');

const API = 'http://api.test/api';

const POST: PostDetail = {
  id: 1,
  title: 'Meu post',
  slug: 'meu-post',
  excerpt: 'Resumo do post',
  cover_image_url: 'https://cdn.example/capa.jpg',
  published_at: '2026-11-20T10:00:00-03:00',
  updated_at: '2026-11-20T10:00:00-03:00',
  reading_time: 3,
  author: { name: 'Autora' },
  category: { id: 1, name: 'Laravel', slug: 'laravel', description: null },
  tags: [{ id: 1, name: 'php', slug: 'php' }],
  body_html:
    '<h2>Seção<a class="heading-permalink" href="#secao-secao">#</a></h2><p><strong>Corpo</strong></p>' +
    '<ul><li><input checked="" disabled="" type="checkbox"> feito</li></ul>',
};

async function render(slug = 'meu-post') {
  const response: ResponseInit = {};
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
      { provide: LOCALE_ID, useValue: 'pt-BR' },
      { provide: RESPONSE_INIT, useValue: response },
    ],
  });
  const fixture = TestBed.createComponent(PostPage);
  fixture.componentRef.setInput('slug', slug);
  fixture.detectChanges();

  return {
    fixture,
    response,
    http: TestBed.inject(HttpTestingController),
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('PostPage', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('requests the post by slug and renders header, metadata and body', async () => {
    const { fixture, http, element } = await render();

    http.expectOne(`${API}/posts/meu-post`).flush({ data: POST });
    await fixture.whenStable();

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Meu post');
    expect(element.querySelector('.article__meta')?.textContent).toContain('Autora');
    expect(element.querySelector('.article__meta')?.textContent).toContain('3 min de leitura');
    expect(element.querySelector('a.eyebrow')?.getAttribute('href')).toBe('/categorias/laravel');
    expect(element.querySelector('.chip')?.getAttribute('href')).toBe('/tags/php');
    expect(element.querySelector('.prose strong')?.textContent).toBe('Corpo');
  });

  it('restores heading anchors and task list symbols removed by the sanitizer', async () => {
    const { fixture, http, element } = await render();

    http.expectOne(`${API}/posts/meu-post`).flush({ data: POST });
    await fixture.whenStable();

    expect(element.querySelector('.prose h2')?.id).toBe('secao-secao');
    expect(element.querySelector('.prose .task-box')?.textContent).toBe('☑');
  });

  it('sets title, description and Open Graph article tags', async () => {
    const { fixture, http } = await render();

    http.expectOne(`${API}/posts/meu-post`).flush({ data: POST });
    await fixture.whenStable();

    const meta = TestBed.inject(Meta);
    expect(TestBed.inject(Title).getTitle()).toContain('Meu post');
    expect(meta.getTag('name="description"')?.content).toBe('Resumo do post');
    expect(meta.getTag('property="og:type"')?.content).toBe('article');
    expect(meta.getTag('property="og:image"')?.content).toBe('https://cdn.example/capa.jpg');
  });

  it('shows not found and answers 404 during server rendering for an unknown post', async () => {
    const { fixture, http, element, response } = await render('nao-existe');

    http
      .expectOne(`${API}/posts/nao-existe`)
      .flush({ message: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(element.querySelector('h1')?.textContent).toContain('Post não encontrado');
    expect(response.status).toBe(404);
    expect(TestBed.inject(Title).getTitle()).toContain('Post não encontrado');
  });

  it('shows a retry button for other errors and requests again', async () => {
    const { fixture, http, element, response } = await render();

    http.expectOne(`${API}/posts/meu-post`).flush(null, { status: 500, statusText: 'Erro' });
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível carregar o post.',
    );
    expect(response.status).toBeUndefined();

    element.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    fixture.detectChanges();
    http.expectOne(`${API}/posts/meu-post`).flush({ data: POST });
    await fixture.whenStable();

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Meu post');
  });
});
