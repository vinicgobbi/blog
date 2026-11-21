import { PaginatedResponse } from '../app/shared/models/api';
import { PostSummary } from '../app/shared/models/blog';

/** Resposta paginada de posts para testes. */
export function postsPage(
  posts: Partial<PostSummary>[] = [],
  meta: Partial<PaginatedResponse<PostSummary>['meta']> = {},
): PaginatedResponse<PostSummary> {
  return {
    data: posts.map((post, index) => ({
      id: index + 1,
      title: `Post ${index + 1}`,
      slug: `post-${index + 1}`,
      excerpt: null,
      cover_image_url: null,
      published_at: '2026-11-20T10:00:00-03:00',
      reading_time: 1,
      author: { name: 'Autora' },
      category: null,
      tags: [],
      ...post,
    })),
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: 1,
      from: posts.length ? 1 : null,
      last_page: 1,
      per_page: 10,
      to: posts.length || null,
      total: posts.length,
      ...meta,
    },
  };
}
