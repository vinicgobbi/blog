import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_URL } from '../../../core/api';
import { PaginatedResponse } from '../../../shared/models/api';
import { AdminComment } from '../../../shared/models/admin';
import { shownToasts } from '../../../../testing/toasts';
import { CommentCounts } from './comment-counts';
import { CommentListPage } from './comment-list-page';

registerLocaleData(localePt, 'pt-BR');

const API = 'http://api.test/api';
const COUNTS = { pending: 2, approved: 5, rejected: 1, spam: 3 };

function page(comments: Partial<AdminComment>[]): PaginatedResponse<AdminComment> {
  return {
    data: comments.map((comment, index) => ({
      id: index + 1,
      author_name: `Leitor ${index + 1}`,
      author_email: `leitor${index + 1}@exemplo.com`,
      body: 'Ótimo post!',
      status: 'pending',
      ip_address: '203.0.113.5',
      user_agent: 'Firefox',
      post: { id: 10, title: 'Meu post', slug: 'meu-post' },
      created_at: '2026-11-20T10:00:00-03:00',
      updated_at: '2026-11-20T10:00:00-03:00',
      ...comment,
    })),
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: 1,
      from: 1,
      last_page: 1,
      per_page: 30,
      to: comments.length,
      total: comments.length,
    },
  };
}

async function render(status?: string, comments: Partial<AdminComment>[] = [{}]) {
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
  const fixture = TestBed.createComponent(CommentListPage);
  if (status) {
    fixture.componentRef.setInput('status', status);
  }
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  const expectedStatus = status === 'all' ? '' : `?status=${status ?? 'pending'}`;
  http.expectOne(`${API}/admin/comments${expectedStatus}`).flush(page(comments));
  flushCounts(http);
  await fixture.whenStable();

  return { fixture, router, http, element: fixture.nativeElement as HTMLElement };
}

function flushCounts(http: HttpTestingController, counts = COUNTS): void {
  http.match(`${API}/admin/comments/counts`).forEach((request) => request.flush({ data: counts }));
}

function button(element: HTMLElement, text: string): HTMLButtonElement {
  return [...element.querySelectorAll<HTMLButtonElement>('.comment__actions button')].find((b) =>
    b.textContent?.includes(text),
  )!;
}

describe('CommentListPage', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
  });

  it('shows pending comments by default with author, post and counts per status', async () => {
    const { element } = await render();

    const pressed = element.querySelector('.filters [aria-pressed="true"]');
    expect(pressed?.textContent).toContain('Pendentes');
    expect(pressed?.textContent).toContain('2');
    expect(element.querySelector('.filters')?.textContent).toContain('11');

    const comment = element.querySelector('.comment')!;
    expect(comment.textContent).toContain('Leitor 1');
    expect(comment.textContent).toContain('leitor1@exemplo.com');
    expect(comment.querySelector('.comment__body')?.textContent).toBe('Ótimo post!');
    expect(comment.querySelector('a[href="/admin/posts/10"]')?.textContent).toContain('Meu post');
    expect(comment.querySelector('a[href="/posts/meu-post#comentarios-titulo"]')).not.toBeNull();
  });

  it('renders the comment body as text, never as HTML', async () => {
    const { element } = await render(undefined, [{ body: '<img src=x onerror=alert(1)>' }]);

    const body = element.querySelector('.comment__body')!;
    expect(body.querySelector('img')).toBeNull();
    expect(body.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('lists all comments without a status filter', async () => {
    const { element } = await render('all', [{ status: 'approved' }, { status: 'spam' }]);

    const badges = [...element.querySelectorAll('.comment .badge')].map((b) =>
      b.textContent?.trim(),
    );
    expect(badges).toEqual(['Aprovado', 'Spam']);
  });

  it('changes the filter through the URL, keeping pending as the default', async () => {
    const { element, router } = await render('spam', []);

    expect(element.querySelector('.state')?.textContent).toContain('Nenhum comentário encontrado.');
    [...element.querySelectorAll<HTMLButtonElement>('.filters button')]
      .find((b) => b.textContent?.includes('Pendentes'))!
      .click();

    expect(router.navigate).toHaveBeenCalledWith([], {
      queryParams: { status: null, page: null },
      queryParamsHandling: 'merge',
    });
  });

  it('offers only the actions that change the current status', async () => {
    const { element } = await render('approved', [{ status: 'approved' }]);

    const labels = [...element.querySelectorAll('.comment__actions button')].map((b) =>
      b.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(labels).toEqual([
      'Rejeitar o comentário de Leitor 1',
      'Marcar como spam o comentário de Leitor 1',
      'Voltar para pendente o comentário de Leitor 1',
      'Excluir o comentário de Leitor 1',
    ]);
  });

  it('approves a comment, then reloads the list and the counts', async () => {
    const { fixture, http, element } = await render();
    const counts = TestBed.inject(CommentCounts);

    button(element, 'Aprovar').click();
    const request = http.expectOne({ method: 'PUT', url: `${API}/admin/comments/1` });
    expect(request.request.body).toEqual({ status: 'approved' });
    request.flush({ data: page([{ status: 'approved' }]).data[0] });

    await vi
      .waitFor(() => http.expectOne(`${API}/admin/comments?status=pending`))
      .then((r) => r.flush(page([])));
    flushCounts(http, { ...COUNTS, pending: 1, approved: 6 });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(counts.pending()).toBe(1);
    expect(shownToasts()).toEqual([{ kind: 'success', message: 'Comentário aprovado.' }]);
  });

  it('deletes a comment only after confirmation', async () => {
    const { fixture, http, element } = await render();
    const confirm = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    button(element, 'Excluir').click();
    http.expectNone({ method: 'DELETE', url: `${API}/admin/comments/1` });

    button(element, 'Excluir').click();
    expect(confirm).toHaveBeenLastCalledWith(
      'Excluir definitivamente o comentário de "Leitor 1"? Esta ação não pode ser desfeita.',
    );
    http
      .expectOne({ method: 'DELETE', url: `${API}/admin/comments/1` })
      .flush(null, { status: 204, statusText: 'No Content' });

    await vi
      .waitFor(() => http.expectOne(`${API}/admin/comments?status=pending`))
      .then((r) => r.flush(page([])));
    flushCounts(http);
    await fixture.whenStable();
  });

  it('shows an error and re-enables the actions when moderation fails', async () => {
    const { fixture, http, element } = await render();

    button(element, 'Rejeitar').click();
    fixture.detectChanges();
    expect(button(element, 'Rejeitar').disabled).toBe(true);
    http
      .expectOne({ method: 'PUT', url: `${API}/admin/comments/1` })
      .flush(null, { status: 500, statusText: 'Server Error' });

    await vi.waitFor(() =>
      expect(shownToasts()).toEqual([
        {
          kind: 'error',
          message: 'Não foi possível atualizar o comentário de "Leitor 1". Tente novamente.',
        },
      ]),
    );
    await fixture.whenStable();
    expect(button(element, 'Rejeitar').disabled).toBe(false);
  });
});
