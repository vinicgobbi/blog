import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { API_URL } from '../../core/api';
import { Observable } from 'rxjs';
import { PaginatedResponse, ResourceResponse } from '../../shared/models/api';
import { AdminPost, AdminPostInput, AdminPostQuery } from '../../shared/models/admin';
import { Category } from '../../shared/models/blog';

import { PostState } from '../../shared/models/admin';

export type { PostState };

export interface CommentCounts {
  pending: number;
  approved: number;
  rejected: number;
  spam: number;
}

/**
 * Endpoints da área administrativa (`/admin/*`). O token é anexado pelo
 * authInterceptor; a área admin é renderizada só no navegador.
 */
@Service()
export class AdminApi {
  private readonly apiUrl = inject(API_URL);
  private readonly http = inject(HttpClient);

  /** Total de posts numa situação (usa per_page=1 e lê só o meta.total). */
  postCount(state: PostState): HttpResourceRef<number | undefined> {
    return httpResource<number>(
      () => ({ url: `${this.apiUrl}/admin/posts`, params: { state, per_page: 1 } }),
      { parse: (response) => (response as PaginatedResponse<unknown>).meta.total },
    );
  }

  commentCounts(): HttpResourceRef<CommentCounts | undefined> {
    return httpResource<CommentCounts>(() => `${this.apiUrl}/admin/comments/counts`, {
      parse: (response) => (response as { data: CommentCounts }).data,
    });
  }

  /** Todos os posts (rascunhos, agendados e publicados), com filtros. */
  posts(query: () => AdminPostQuery): HttpResourceRef<PaginatedResponse<AdminPost> | undefined> {
    return httpResource<PaginatedResponse<AdminPost>>(() => {
      const { state, q, page } = query();
      const params: Record<string, string | number> = {};

      if (state) {
        params['state'] = state;
      }
      if (q) {
        params['q'] = q;
      }
      if (page && page > 1) {
        params['page'] = page;
      }

      return { url: `${this.apiUrl}/admin/posts`, params };
    });
  }

  /** Post completo, com o Markdown original; undefined não faz requisição (post novo). */
  post(id: () => number | undefined): HttpResourceRef<AdminPost | undefined> {
    return httpResource<AdminPost>(
      () => {
        const value = id();

        return value ? `${this.apiUrl}/admin/posts/${value}` : undefined;
      },
      { parse: (response) => (response as ResourceResponse<AdminPost>).data },
    );
  }

  categories(): HttpResourceRef<Category[] | undefined> {
    return httpResource<Category[]>(() => `${this.apiUrl}/admin/categories`, {
      parse: (response) => (response as ResourceResponse<Category[]>).data,
    });
  }

  /** Cria (id nulo) ou atualiza um post. */
  savePost(id: number | null, post: AdminPostInput): Observable<ResourceResponse<AdminPost>> {
    return id
      ? this.http.put<ResourceResponse<AdminPost>>(`${this.apiUrl}/admin/posts/${id}`, post)
      : this.http.post<ResourceResponse<AdminPost>>(`${this.apiUrl}/admin/posts`, post);
  }

  /** Move o post para a lixeira (soft delete). */
  deletePost(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/posts/${id}`);
  }

  /** HTML do Markdown, gerado pelo mesmo renderizador dos posts publicados. */
  markdownPreview(markdown: () => string | undefined): HttpResourceRef<string | undefined> {
    return httpResource<string>(
      () => {
        const value = markdown();

        return value === undefined
          ? undefined
          : {
              url: `${this.apiUrl}/admin/markdown/preview`,
              method: 'POST',
              body: { markdown: value },
            };
      },
      { parse: (response) => (response as { html: string }).html },
    );
  }
}
