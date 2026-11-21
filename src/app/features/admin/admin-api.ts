import { httpResource, HttpResourceRef } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { API_URL } from '../../core/api';
import { PaginatedResponse } from '../../shared/models/api';

export type PostState = 'draft' | 'scheduled' | 'published';

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
}
