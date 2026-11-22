import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, input, model, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormValueControl } from '@angular/forms/signals';
import { Router, provideRouter } from '@angular/router';
import { API_URL } from '../../../core/api';
import { AdminPost } from '../../../shared/models/admin';
import { shownToasts } from '../../../../testing/toasts';
import { MarkdownEditor } from '../editor/markdown-editor';
import { PostEditorPage, toFormModel, toPostInput } from './post-editor-page';

/**
 * Substitui o editor de Markdown (que tem testes próprios) por um textarea
 * simples com o mesmo contrato de controle do Signal Forms.
 */
@Component({
  selector: 'app-markdown-editor',
  template: `<textarea
    [id]="inputId()"
    [value]="value()"
    (input)="value.set($any($event.target).value)"
    (blur)="touch.emit()"
  ></textarea>`,
})
class MarkdownEditorStub implements FormValueControl<string> {
  readonly value = model('');
  readonly touch = output<void>();
  readonly inputId = input('');
  readonly describedBy = input<string | null>(null);
}

const API = 'http://api.test/api';

const POST: AdminPost = {
  id: 7,
  title: 'Meu post',
  slug: 'meu-post',
  excerpt: 'Resumo',
  body_markdown: '## Olá',
  body_html: '<h2>Olá</h2>',
  cover_image_path: null,
  cover_image_url: null,
  status: 'draft',
  state: 'draft',
  published_at: null,
  reading_time: 1,
  author: { id: 1, name: 'Admin' },
  category: { id: 3, name: 'Laravel', slug: 'laravel', description: null },
  tags: [
    { id: 1, name: 'PHP', slug: 'php' },
    { id: 2, name: 'Laravel 13', slug: 'laravel-13' },
  ],
  created_at: '2026-11-20T10:00:00-03:00',
  updated_at: '2026-11-20T10:00:00-03:00',
};

describe('post form conversions', () => {
  it('maps an API post to form values', () => {
    expect(toFormModel(POST)).toEqual({
      title: 'Meu post',
      slug: 'meu-post',
      excerpt: 'Resumo',
      body_markdown: '## Olá',
      category_id: '3',
      tags: 'PHP, Laravel 13',
      cover_image_path: '',
      published_at: '',
    });
  });

  it('maps form values to the API payload, trimming text and splitting tags', () => {
    const input = toPostInput(
      {
        title: '  Título  ',
        slug: '',
        excerpt: ' ',
        body_markdown: 'Corpo',
        category_id: '',
        tags: ' php, , Angular ,',
        cover_image_path: '',
        published_at: '',
      },
      'published',
    );

    expect(input).toEqual({
      title: 'Título',
      slug: null,
      excerpt: null,
      body_markdown: 'Corpo',
      category_id: null,
      cover_image_path: null,
      status: 'published',
      published_at: null,
      tags: ['php', 'Angular'],
    });
  });
});

function render(id?: number) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
    ],
  });
  TestBed.overrideComponent(PostEditorPage, {
    remove: { imports: [MarkdownEditor] },
    add: { imports: [MarkdownEditorStub] },
  });
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(PostEditorPage);
  if (id) {
    fixture.componentRef.setInput('id', String(id));
  }
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  http
    .expectOne(`${API}/admin/categories`)
    .flush({ data: [{ id: 3, name: 'Laravel', slug: 'laravel', description: null }] });

  return { fixture, router, http, element: fixture.nativeElement as HTMLElement };
}

function type(element: HTMLElement, selector: string, value: string): void {
  const field = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
  field.value = value;
  field.dispatchEvent(new Event('input'));
}

async function click(
  fixture: ComponentFixture<PostEditorPage>,
  element: HTMLElement,
  text: string,
): Promise<void> {
  const button = [
    ...element.querySelectorAll<HTMLButtonElement>('.post-form__actions button'),
  ].find((b) => b.textContent?.includes(text))!;
  button.click();
  await fixture.whenStable();
}

describe('PostEditorPage', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('creates a published post and opens it for editing', async () => {
    const { fixture, router, http, element } = render();
    type(element, '#post-titulo', 'Novo post');
    type(element, '#post-conteudo', 'Conteúdo');
    type(element, '#post-tags', 'php, angular');
    await fixture.whenStable();

    await click(fixture, element, 'Publicar');
    const request = http.expectOne({ method: 'POST', url: `${API}/admin/posts` });
    expect(request.request.body).toMatchObject({
      title: 'Novo post',
      body_markdown: 'Conteúdo',
      status: 'published',
      tags: ['php', 'angular'],
    });
    request.flush(
      { data: { ...POST, id: 9, status: 'published', state: 'published' } },
      { status: 201, statusText: 'Created' },
    );

    await vi.waitFor(() =>
      expect(router.navigate).toHaveBeenCalledWith(['/admin/posts', 9], { replaceUrl: true }),
    );
    expect(shownToasts()).toEqual([{ kind: 'success', message: 'Post publicado.' }]);
  });

  it('does not save without title and content', async () => {
    const { fixture, http, element } = render();

    await click(fixture, element, 'Salvar rascunho');
    fixture.detectChanges();

    http.expectNone({ method: 'POST', url: `${API}/admin/posts` });
    expect(element.querySelector('#post-titulo-erro')?.textContent).toContain('Informe o título.');
    expect(element.querySelector('#post-conteudo-erro')?.textContent).toContain(
      'Escreva o conteúdo do post.',
    );
  });

  it('loads an existing post and saves it as draft with PUT', async () => {
    const { fixture, http, element } = render(7);
    http.expectOne(`${API}/admin/posts/7`).flush({ data: POST });
    await fixture.whenStable();

    expect(element.querySelector<HTMLInputElement>('#post-titulo')?.value).toBe('Meu post');
    expect(element.querySelector<HTMLInputElement>('#post-tags')?.value).toBe('PHP, Laravel 13');
    expect(element.querySelector<HTMLSelectElement>('#post-categoria')?.value).toBe('3');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);

    type(element, '#post-titulo', 'Título editado');
    await fixture.whenStable();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);

    await click(fixture, element, 'Salvar rascunho');
    const request = http.expectOne({ method: 'PUT', url: `${API}/admin/posts/7` });
    expect(request.request.body).toMatchObject({
      title: 'Título editado',
      status: 'draft',
      category_id: 3,
    });
    request.flush({ data: { ...POST, title: 'Título editado' } });

    await vi.waitFor(() =>
      expect(shownToasts()).toEqual([{ kind: 'success', message: 'Rascunho salvo.' }]),
    );
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('shows an error toast when the API fails to save', async () => {
    const { fixture, http, element } = render();
    type(element, '#post-titulo', 'Título');
    type(element, '#post-conteudo', 'Conteúdo');
    await fixture.whenStable();

    await click(fixture, element, 'Publicar');
    http
      .expectOne({ method: 'POST', url: `${API}/admin/posts` })
      .flush(null, { status: 500, statusText: 'Server Error' });

    await vi.waitFor(() =>
      expect(shownToasts()).toEqual([
        { kind: 'error', message: 'Não foi possível salvar o post. Tente novamente.' },
      ]),
    );
  });

  it('labels the main action as "Agendar" for a future publication date', async () => {
    const { fixture, element } = render();

    element.querySelector<HTMLButtonElement>('#post-data')!.click();
    await fixture.whenStable();
    [...element.querySelectorAll<HTMLButtonElement>('.datetime-picker__actions button')]
      .find((button) => button.textContent?.includes('Amanhã'))!
      .click();
    await fixture.whenStable();

    expect(
      element.querySelector('.post-form__actions button[type="submit"]')?.textContent,
    ).toContain('Agendar');
  });

  it('shows API validation errors next to the fields, including tags', async () => {
    const { fixture, http, element } = render();
    type(element, '#post-titulo', 'Título');
    type(element, '#post-conteudo', 'Conteúdo');
    type(element, '#post-slug', 'meu-post');
    await fixture.whenStable();

    await click(fixture, element, 'Publicar');
    http.expectOne({ method: 'POST', url: `${API}/admin/posts` }).flush(
      {
        message: 'Dados inválidos',
        errors: {
          slug: ['Já existe um post com este slug'],
          'tags.0': ['Cada tag pode ter no máximo 50 caracteres'],
        },
      },
      { status: 422, statusText: 'Unprocessable Content' },
    );

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('#post-slug-erro')?.textContent).toContain(
        'Já existe um post com este slug',
      );
    });
    expect(element.querySelector('#post-tags-erro')?.textContent).toContain(
      'no máximo 50 caracteres',
    );
    expect(shownToasts()).toEqual([{ kind: 'warning', message: 'Corrija os campos destacados.' }]);
  });

  it('sets the cover from the media library and sends its path', async () => {
    const { fixture, http, element } = render();
    type(element, '#post-titulo', 'Com capa');
    type(element, '#post-conteudo', 'Conteúdo');
    await fixture.whenStable();

    [...element.querySelectorAll<HTMLButtonElement>('.cover__actions button')]
      .find((b) => b.textContent?.includes('Escolher imagem'))!
      .click();
    fixture.detectChanges();
    http.expectOne(`${API}/admin/media`).flush({
      data: [
        {
          id: 5,
          url: 'http://api.test/storage/media/capa.jpg',
          path: 'media/capa.jpg',
          original_name: 'capa.jpg',
          mime_type: 'image/jpeg',
          size: 1000,
          width: 1200,
          height: 600,
          alt: null,
          markdown: '',
          created_at: '2026-11-20T10:00:00-03:00',
        },
      ],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, from: 1, last_page: 1, per_page: 30, to: 1, total: 1 },
    });
    await fixture.whenStable();
    [...element.querySelectorAll<HTMLButtonElement>('dialog button')]
      .find((b) => b.textContent?.includes('Usar esta imagem'))!
      .click();
    await fixture.whenStable();

    expect(element.querySelector('.cover__image')?.getAttribute('src')).toBe(
      'http://api.test/storage/media/capa.jpg',
    );
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);

    await click(fixture, element, 'Publicar');
    const request = http.expectOne({ method: 'POST', url: `${API}/admin/posts` });
    expect(request.request.body).toMatchObject({ cover_image_path: 'media/capa.jpg' });
    request.flush(
      {
        data: {
          ...POST,
          id: 10,
          cover_image_path: 'media/capa.jpg',
          cover_image_url: 'http://api.test/storage/media/capa.jpg',
        },
      },
      { status: 201, statusText: 'Created' },
    );
  });
});
