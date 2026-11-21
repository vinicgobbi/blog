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

/** Imagem da biblioteca de mídia (Admin\MediaResource da API). */
export interface Media {
  id: number;
  url: string;
  /** Caminho no disco público; é o valor usado em cover_image_path. */
  path: string;
  original_name: string;
  mime_type: string;
  /** Tamanho em bytes. */
  size: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  /** Snippet pronto para o editor, ex.: ![alt](url). */
  markdown: string;
  created_at: string;
}

/** Página estática na visão do admin (Admin\PageResource da API). */
export interface AdminPage {
  id: number;
  title: string;
  slug: string;
  /** Só presentes no detalhe (GET /admin/pages/{id}). */
  body_markdown?: string;
  body_html?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

/** Corpo de POST/PUT /admin/pages. */
export interface AdminPageInput {
  title: string;
  slug: string | null;
  body_markdown: string;
  is_published: boolean;
}

/** Corpo de POST/PUT /admin/categories e /admin/tags (tags ignoram a descrição). */
export interface TaxonomyInput {
  name: string;
  slug: string | null;
  description?: string | null;
}
