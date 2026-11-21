import { Component, computed, effect, inject, input, linkedSignal } from '@angular/core';
import { FormField, form, maxLength } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { SeoService } from '../../../core/seo/seo.service';
import { PostList } from '../../../shared/components/post-list/post-list';
import { BlogApi } from '../blog-api';
import { toPageNumber } from '../home/home-page';

/** Mesmo limite da API (`q` com no máximo 100 caracteres). */
export const SEARCH_MAX_LENGTH = 100;

/**
 * Busca de posts por título e resumo (`/busca?q=termo`). A URL guarda o termo,
 * então a busca pode ser compartilhada; a página não é indexada.
 */
@Component({
  selector: 'app-search-page',
  imports: [FormField, PostList],
  templateUrl: './search-page.html',
  styleUrl: './search-page.scss',
})
export class SearchPage {
  /** Preenchidos pelos query params `?q=` e `?page=`. */
  readonly q = input('', { transform: (value: unknown) => String(value ?? '').trim() });
  readonly page = input(1, { transform: toPageNumber });

  private readonly router = inject(Router);

  /** Campo do formulário, sincronizado com o termo da URL. */
  protected readonly model = linkedSignal(() => ({ q: this.q() }));
  protected readonly searchForm = form(this.model, (path) => {
    maxLength(path.q, SEARCH_MAX_LENGTH, {
      message: `A busca pode ter no máximo ${SEARCH_MAX_LENGTH} caracteres.`,
    });
  });

  protected readonly posts = inject(BlogApi).posts(() =>
    this.q() ? { q: this.q(), page: this.page() } : undefined,
  );
  protected readonly total = computed(() =>
    this.posts.hasValue() ? (this.posts.value()?.meta.total ?? 0) : null,
  );

  constructor() {
    const seo = inject(SeoService);

    effect(() => {
      const term = this.q();
      seo.update({ title: term ? `Busca: ${term}` : 'Busca', path: '/busca', noindex: true });
    });
  }

  protected search(event: Event): void {
    event.preventDefault();

    if (this.searchForm().invalid()) {
      this.searchForm.q().markAsTouched();

      return;
    }

    const term = this.model().q.trim();
    void this.router.navigate(['/busca'], { queryParams: { q: term || null } });
  }
}
