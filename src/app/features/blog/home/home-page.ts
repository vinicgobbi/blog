import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { SeoService } from '../../../core/seo/seo.service';
import { PostList } from '../../../shared/components/post-list/post-list';
import { BlogApi } from '../blog-api';
import { SearchForm } from '../search/search-form';

/** Converte o `?page=` da URL num número de página válido (1 se ausente ou inválido). */
export function toPageNumber(value: unknown): number {
  const page = Number(value);

  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/**
 * Página inicial: lista paginada dos posts publicados, com a busca por título
 * e resumo (`/?q=termo`). Os resultados de busca não são indexados.
 */
@Component({
  selector: 'app-home-page',
  imports: [PostList, RouterLink, SearchForm],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  /** Preenchidos pelos query params `?q=` e `?page=` (withComponentInputBinding). */
  readonly q = input('', { transform: (value: unknown) => String(value ?? '').trim() });
  readonly page = input(1, { transform: toPageNumber });

  protected readonly siteDescription = environment.siteDescription;
  /** Sem nenhum post publicado (fora de uma busca). */
  protected readonly emptyHomeMessage =
    'Coisas boas virão em sua direção. Aguarde até um próximo momento.';
  protected readonly posts = inject(BlogApi).posts(() => ({
    q: this.q() || undefined,
    page: this.page(),
  }));
  /** Total de resultados da busca; `null` enquanto carrega ou se a requisição falhar. */
  protected readonly total = computed(() =>
    this.posts.hasValue() ? (this.posts.value()?.meta.total ?? 0) : null,
  );

  constructor() {
    const seo = inject(SeoService);

    effect(() => {
      const term = this.q();
      seo.update(term ? { title: `Busca: ${term}`, path: '/', noindex: true } : { path: '/' });
    });
  }
}
