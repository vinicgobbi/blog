import { Component, inject, input } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { SeoService } from '../../../core/seo/seo.service';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { PostCard } from '../../../shared/components/post-card/post-card';
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
  imports: [PostCard, Pagination],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  /** Preenchido pelo query param `?page=` (withComponentInputBinding). */
  readonly page = input(1, { transform: toPageNumber });

  protected readonly siteName = environment.siteName;
  protected readonly posts = inject(BlogApi).posts(() => ({ page: this.page() }));

  constructor() {
    inject(SeoService).update({ path: '/' });
  }
}
