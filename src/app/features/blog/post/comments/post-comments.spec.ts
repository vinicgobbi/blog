import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '../../../../core/api';
import { PaginatedResponse } from '../../../../shared/models/api';
import { PostComment } from '../../../../shared/models/blog';
import { PostComments } from './post-comments';

registerLocaleData(localePt, 'pt-BR');

const API = 'http://api.test/api';
const COMMENTS_URL = `${API}/posts/meu-post/comments`;

function page(comments: PostComment[]): PaginatedResponse<PostComment> {
  return {
    data: comments,
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: 1,
      from: 1,
      last_page: 1,
      per_page: 50,
      to: comments.length,
      total: comments.length,
    },
  };
}

async function render() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
      { provide: LOCALE_ID, useValue: 'pt-BR' },
    ],
  });
  const fixture = TestBed.createComponent(PostComments);
  fixture.componentRef.setInput('slug', 'meu-post');
  fixture.detectChanges();

  return {
    fixture,
    http: TestBed.inject(HttpTestingController),
    element: fixture.nativeElement as HTMLElement,
  };
}

function type(element: HTMLElement, selector: string, value: string): void {
  const field = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
  field.value = value;
  field.dispatchEvent(new Event('input'));
  field.dispatchEvent(new Event('blur'));
}

async function fillValidForm(
  fixture: ComponentFixture<PostComments>,
  element: HTMLElement,
): Promise<void> {
  type(element, '#comentario-nome', 'Leitora');
  type(element, '#comentario-email', 'leitora@example.com');
  type(element, '#comentario-texto', 'Ótimo post!');
  await fixture.whenStable();
}

async function submitForm(
  fixture: ComponentFixture<PostComments>,
  element: HTMLElement,
): Promise<void> {
  element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  await fixture.whenStable();
}

describe('PostComments', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lists approved comments with count, rendering the body as plain text', async () => {
    const { fixture, http, element } = await render();

    http.expectOne(COMMENTS_URL).flush(
      page([
        {
          id: 1,
          author_name: 'Ana',
          body: 'Primeiro <b>comentário</b>',
          created_at: '2026-11-20T10:00:00-03:00',
        },
        { id: 2, author_name: 'bruno', body: 'Segundo', created_at: '2026-11-21T10:00:00-03:00' },
      ]),
    );
    await fixture.whenStable();

    expect(element.querySelector('.comments__count')?.textContent?.trim()).toBe('2');
    const items = element.querySelectorAll('.comment');
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('.comment__body')?.textContent).toBe(
      'Primeiro <b>comentário</b>',
    );
    expect(items[0].querySelector('b')).toBeNull();
    expect(items[1].querySelector('.comment__avatar')?.textContent).toBe('B');
  });

  it('invites the first comment when there is none', async () => {
    const { fixture, http, element } = await render();

    http.expectOne(COMMENTS_URL).flush(page([]));
    await fixture.whenStable();

    expect(element.textContent).toContain('Ainda não há comentários. Seja o primeiro!');
  });

  it('does not send an incomplete comment and shows the validation messages', async () => {
    const { fixture, http, element } = await render();
    http.expectOne(COMMENTS_URL).flush(page([]));
    type(element, '#comentario-email', 'nao-e-email');

    await submitForm(fixture, element);

    http.expectNone({ method: 'POST', url: COMMENTS_URL });
    expect(element.querySelector('#comentario-nome-erro')?.textContent).toContain(
      'Informe seu nome.',
    );
    expect(element.querySelector('#comentario-email-erro')?.textContent).toContain(
      'Informe um e-mail válido.',
    );
    expect(element.querySelector('#comentario-texto-erro')?.textContent).toContain(
      'Escreva seu comentário.',
    );
    expect(element.querySelector('#comentario-nome')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('sends the comment with an empty honeypot, confirms moderation and clears the form', async () => {
    const { fixture, http, element } = await render();
    http.expectOne(COMMENTS_URL).flush(page([]));
    await fillValidForm(fixture, element);

    await submitForm(fixture, element);
    const request = http.expectOne({ method: 'POST', url: COMMENTS_URL });
    expect(request.request.body).toEqual({
      author_name: 'Leitora',
      author_email: 'leitora@example.com',
      body: 'Ótimo post!',
      website: '',
    });
    request.flush({ message: 'ok' }, { status: 202, statusText: 'Accepted' });

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('[role="status"]')?.textContent).toContain(
        'será publicado após a moderação',
      );
    });
    expect(element.querySelector<HTMLInputElement>('#comentario-nome')?.value).toBe('');
    expect(element.querySelector('#comentario-nome-erro')?.textContent?.trim()).toBe('');
  });

  it('shows validation errors returned by the API next to each field', async () => {
    const { fixture, http, element } = await render();
    http.expectOne(COMMENTS_URL).flush(page([]));
    await fillValidForm(fixture, element);

    await submitForm(fixture, element);
    http
      .expectOne({ method: 'POST', url: COMMENTS_URL })
      .flush(
        { message: 'Dados inválidos', errors: { author_email: ['Informe um e-mail válido'] } },
        { status: 422, statusText: 'Unprocessable Content' },
      );

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('#comentario-email-erro')?.textContent).toContain(
        'Informe um e-mail válido',
      );
    });
    expect(element.querySelector('[role="status"]')).toBeNull();
  });

  it('asks to wait when the API rate limits the comments', async () => {
    const { fixture, http, element } = await render();
    http.expectOne(COMMENTS_URL).flush(page([]));
    await fillValidForm(fixture, element);

    await submitForm(fixture, element);
    http
      .expectOne({ method: 'POST', url: COMMENTS_URL })
      .flush(null, { status: 429, statusText: 'Too Many Requests' });

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('[role="alert"]')?.textContent).toContain('Aguarde um minuto');
    });
  });

  it('keeps the honeypot out of the tab order and hidden from assistive technology', async () => {
    const { http, element } = await render();
    http.expectOne(COMMENTS_URL).flush(page([]));

    const honeypot = element.querySelector('#comentario-site')!;
    expect(honeypot.getAttribute('tabindex')).toBe('-1');
    expect(honeypot.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
