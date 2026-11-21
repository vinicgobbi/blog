import { Component, inject, input } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { SeoService } from '../../../core/seo/seo.service';
import { PostList } from '../../../shared/components/post-list/post-list';
import { BlogApi } from '../blog-api';

/** Converte o `?page=` da URL num número de página válido (1 se ausente ou inválido). */
export function toPageNumber(value: unknown): number {
  const page = Number(value);

  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/**
 * Página inicial: lista paginada dos posts publicados.
 */
@Component({
  selector: 'app-home-page',
  imports: [PostList],
  templateUrl: './home-page.html',
})
export class HomePage {
  /** Preenchido pelo query param `?page=` (withComponentInputBinding). */
  readonly page = input(1, { transform: toPageNumber });

  protected readonly siteDescription = environment.siteDescription;
  protected readonly posts = inject(BlogApi).posts(() => ({ page: this.page() }));

  constructor() {
    inject(SeoService).update({ path: '/' });
  }
}
