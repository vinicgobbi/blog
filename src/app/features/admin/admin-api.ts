import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { API_URL } from '../../core/api';
import { Observable } from 'rxjs';
import { PaginatedResponse, ResourceResponse } from '../../shared/models/api';
import {
  AdminPage,
  AdminPageInput,
  AdminPost,
  AdminPostInput,
  AdminPostQuery,
  Media,
  TaxonomyInput,
} from '../../shared/models/admin';
import { UploadEvent, toUploadEvents } from './media/image-upload';
import { Category, Tag } from '../../shared/models/blog';

import { PostState } from '../../shared/models/admin';

export type { PostState };

/** Recursos de taxonomia, pelo segmento da URL na API. */
export type TaxonomyKind = 'categories' | 'tags';

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

  /** Categorias ou tags em ordem alfabética, com a contagem de posts (sem paginação). */
  taxonomies(kind: () => TaxonomyKind): HttpResourceRef<(Category | Tag)[] | undefined> {
    return httpResource<(Category | Tag)[]>(() => `${this.apiUrl}/admin/${kind()}`, {
      parse: (response) => (response as ResourceResponse<(Category | Tag)[]>).data,
    });
  }

  /** Cria (id nulo) ou atualiza uma categoria ou tag. */
  saveTaxonomy(
    kind: TaxonomyKind,
    id: number | null,
    input: TaxonomyInput,
  ): Observable<ResourceResponse<Category | Tag>> {
    const url = `${this.apiUrl}/admin/${kind}`;

    return id
      ? this.http.put<ResourceResponse<Category | Tag>>(`${url}/${id}`, input)
      : this.http.post<ResourceResponse<Category | Tag>>(url, input);
  }

  /** Excluir uma categoria deixa os posts sem categoria; excluir uma tag a remove dos posts. */
  deleteTaxonomy(kind: TaxonomyKind, id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/${kind}/${id}`);
  }

  /** Páginas estáticas (publicadas ou não), em ordem alfabética, sem o conteúdo. */
  pages(): HttpResourceRef<AdminPage[] | undefined> {
    return httpResource<AdminPage[]>(() => `${this.apiUrl}/admin/pages`, {
      parse: (response) => (response as ResourceResponse<AdminPage[]>).data,
    });
  }

  /** Página completa, com o Markdown original; undefined não faz requisição (página nova). */
  page(id: () => number | undefined): HttpResourceRef<AdminPage | undefined> {
    return httpResource<AdminPage>(
      () => {
        const value = id();

        return value ? `${this.apiUrl}/admin/pages/${value}` : undefined;
      },
      { parse: (response) => (response as ResourceResponse<AdminPage>).data },
    );
  }

  /** Cria (id nulo) ou atualiza uma página. */
  savePage(id: number | null, page: AdminPageInput): Observable<ResourceResponse<AdminPage>> {
    return id
      ? this.http.put<ResourceResponse<AdminPage>>(`${this.apiUrl}/admin/pages/${id}`, page)
      : this.http.post<ResourceResponse<AdminPage>>(`${this.apiUrl}/admin/pages`, page);
  }

  deletePage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/pages/${id}`);
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

  /** Biblioteca de mídia, das imagens mais recentes às mais antigas (30 por página). */
  media(page: () => number): HttpResourceRef<PaginatedResponse<Media> | undefined> {
    return httpResource<PaginatedResponse<Media>>(() => {
      const params: Record<string, number> = page() > 1 ? { page: page() } : {};

      return { url: `${this.apiUrl}/admin/media`, params };
    });
  }

  /** Envia uma imagem (multipart) informando o progresso. */
  uploadMedia(file: File, alt: string | null): Observable<UploadEvent> {
    const body = new FormData();
    body.append('file', file);
    if (alt) {
      body.append('alt', alt);
    }

    return toUploadEvents(
      this.http.post<ResourceResponse<Media>>(`${this.apiUrl}/admin/media`, body, {
        reportProgress: true,
        observe: 'events',
      }),
    );
  }

  updateMediaAlt(id: number, alt: string | null): Observable<ResourceResponse<Media>> {
    return this.http.put<ResourceResponse<Media>>(`${this.apiUrl}/admin/media/${id}`, { alt });
  }

  /** A API responde 409 quando a imagem está em uso (capa ou conteúdo). */
  deleteMedia(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/media/${id}`);
  }
}
