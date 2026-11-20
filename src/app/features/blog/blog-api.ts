import { httpResource, HttpResourceRef } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { API_URL } from '../../core/api';
import { PaginatedResponse } from '../../shared/models/api';
import { PostQuery, PostSummary } from '../../shared/models/blog';

/**
 * Endpoints públicos da blog-api como recursos baseados em signals.
 *
 * Os métodos devem ser chamados em contexto de injeção (ex.: inicialização
 * de campos de um componente). No SSR, as respostas são transferidas para o
 * navegador pela hidratação, sem repetir a requisição.
 */
@Service()
export class BlogApi {
  private readonly apiUrl = inject(API_URL);

  posts(query: () => PostQuery): HttpResourceRef<PaginatedResponse<PostSummary> | undefined> {
    return httpResource<PaginatedResponse<PostSummary>>(() => ({
      url: `${this.apiUrl}/posts`,
      params: toPostParams(query()),
    }));
  }
}

function toPostParams(query: PostQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {};

  if (query.page && query.page > 1) {
    params['page'] = query.page;
  }
  if (query.perPage) {
    params['per_page'] = query.perPage;
  }
  if (query.tag) {
    params['tag'] = query.tag;
  }
  if (query.category) {
    params['category'] = query.category;
  }
  if (query.q) {
    params['q'] = query.q;
  }

  return params;
}
