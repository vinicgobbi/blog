/** Categoria de posts (CategoryResource da API). */
export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  /** Presente nas listagens e no detalhe da categoria. */
  posts_count?: number;
}

/** Tag de posts (TagResource da API). */
export interface Tag {
  id: number;
  name: string;
  slug: string;
  posts_count?: number;
}

/** Resumo do post usado nas listagens (PostResource da API). */
export interface PostSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  /** Data ISO 8601. */
  published_at: string;
  /** Minutos estimados de leitura. */
  reading_time: number;
  author: { name: string };
  category: Category | null;
  tags: Tag[];
}

/** Post completo (PostDetailResource da API). */
export interface PostDetail extends PostSummary {
  /** HTML já renderizado e sanitizado pela API. */
  body_html: string;
  updated_at: string;
}

/** Filtros aceitos por `GET /posts`. */
export interface PostQuery {
  page?: number;
  perPage?: number;
  tag?: string;
  category?: string;
  q?: string;
}

/** Comentário aprovado (CommentResource da API). */
export interface PostComment {
  id: number;
  author_name: string;
  /** Texto puro: deve ser exibido escapado, nunca como HTML. */
  body: string;
  created_at: string;
}

/** Dados enviados em `POST /posts/{slug}/comments`. */
export interface CommentInput {
  author_name: string;
  author_email: string;
  body: string;
  /** Honeypot: deve ser enviado vazio (só bots preenchem). */
  website: string;
}

/** Página estática publicada (PageResource da API). */
export interface StaticPage {
  id: number;
  title: string;
  slug: string;
  /** HTML já renderizado e sanitizado pela API. */
  body_html: string;
  updated_at: string;
}
