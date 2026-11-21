import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { API_URL } from '../../core/api';
import { ApiStatus, PaginatedResponse, ResourceResponse } from '../../shared/models/api';
import { Observable } from 'rxjs';
import {
  Category,
  CommentInput,
  PostComment,
  PostDetail,
  PostQuery,
  PostSummary,
  PageLink,
  StaticPage,
  Tag,
} from '../../shared/models/blog';

export type TaxonomyKind = 'categories' | 'tags';

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
  private readonly http = inject(HttpClient);

  /** Situação e versão da API (exibida no rodapé). */
  status(): HttpResourceRef<ApiStatus | undefined> {
    return httpResource<ApiStatus>(() => this.apiUrl);
  }

  /** Posts publicados; quando `query` retorna undefined, nenhuma requisição é feita. */
  posts(
    query: () => PostQuery | undefined,
  ): HttpResourceRef<PaginatedResponse<PostSummary> | undefined> {
    return httpResource<PaginatedResponse<PostSummary>>(() => {
      const value = query();

      return value ? { url: `${this.apiUrl}/posts`, params: toPostParams(value) } : undefined;
    });
  }

  /** Categorias ou tags com posts publicados, em ordem alfabética e com a contagem. */
  taxonomies(
    kind: () => TaxonomyKind,
  ): HttpResourceRef<ResourceResponse<(Category | Tag)[]> | undefined> {
    return httpResource<ResourceResponse<(Category | Tag)[]>>(() => `${this.apiUrl}/${kind()}`);
  }

  /** Páginas publicadas, em ordem de criação, para o menu. */
  pages(): HttpResourceRef<ResourceResponse<PageLink[]> | undefined> {
    return httpResource<ResourceResponse<PageLink[]>>(() => `${this.apiUrl}/pages`);
  }

  tag(slug: () => string | undefined): HttpResourceRef<ResourceResponse<Tag> | undefined> {
    return this.bySlug<Tag>('tags', slug);
  }

  category(
    slug: () => string | undefined,
  ): HttpResourceRef<ResourceResponse<Category> | undefined> {
    return this.bySlug<Category>('categories', slug);
  }

  /** Página estática publicada (ex.: "sobre"). */
  page(slug: () => string | undefined): HttpResourceRef<ResourceResponse<StaticPage> | undefined> {
    return this.bySlug<StaticPage>('pages', slug);
  }

  /** Post publicado pelo slug; responde 404 para rascunhos, agendados e inexistentes. */
  post(slug: () => string | undefined): HttpResourceRef<ResourceResponse<PostDetail> | undefined> {
    return httpResource<ResourceResponse<PostDetail>>(() => {
      const value = slug();

      return value ? `${this.apiUrl}/posts/${encodeURIComponent(value)}` : undefined;
    });
  }

  /** Comentários aprovados do post, em ordem cronológica (até 50). */
  comments(
    slug: () => string | undefined,
  ): HttpResourceRef<PaginatedResponse<PostComment> | undefined> {
    return httpResource<PaginatedResponse<PostComment>>(() => {
      const value = slug();

      return value ? `${this.apiUrl}/posts/${encodeURIComponent(value)}/comments` : undefined;
    });
  }

  /** Envia um comentário; ele só aparece no blog depois de aprovado na moderação. */
  sendComment(slug: string, comment: CommentInput): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/posts/${encodeURIComponent(slug)}/comments`,
      comment,
    );
  }

  private bySlug<T>(
    resource: string,
    slug: () => string | undefined,
  ): HttpResourceRef<ResourceResponse<T> | undefined> {
    return httpResource<ResourceResponse<T>>(() => {
      const value = slug();

      return value ? `${this.apiUrl}/${resource}/${encodeURIComponent(value)}` : undefined;
    });
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
