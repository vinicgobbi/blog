/** Resposta de um recurso único da API (Laravel API Resource). */
export interface ResourceResponse<T> {
  data: T;
}

/** Resposta paginada da API (Laravel API Resource collection paginada). */
export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
}

/** Resposta de GET /api: situação e versão da API. */
export interface ApiStatus {
  api: string;
  status: string;
  version: string;
  documentation: string;
}
