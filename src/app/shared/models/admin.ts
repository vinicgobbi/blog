import { Category, Tag } from './blog';

export type PostStatus = 'draft' | 'published';
export type PostState = 'draft' | 'scheduled' | 'published';

/** Post na visão do admin (Admin\PostResource da API). */
export interface AdminPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  /** Só presente no detalhe (GET /admin/posts/{id}). */
  body_markdown?: string;
  body_html?: string;
  cover_image_path: string | null;
  cover_image_url: string | null;
  status: PostStatus;
  /** Situação calculada pela API a partir do status e da data de publicação. */
  state: PostState;
  published_at: string | null;
  reading_time: number;
  author: { id: number; name: string };
  category: Category | null;
  tags: Tag[];
  created_at: string;
  updated_at: string;
}

/** Corpo de POST/PUT /admin/posts. */
export interface AdminPostInput {
  title: string;
  slug: string | null;
  excerpt: string | null;
  body_markdown: string;
  category_id: number | null;
  cover_image_path: string | null;
  status: PostStatus;
  published_at: string | null;
  /** Nomes das tags; as inexistentes são criadas pela API. */
  tags: string[];
}

export interface AdminPostQuery {
  state?: PostState;
  q?: string;
  page?: number;
}
