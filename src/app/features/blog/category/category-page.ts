import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { SeoService } from '../../../core/seo/seo.service';
import { NotFound } from '../../../shared/components/not-found/not-found';
import { PostList } from '../../../shared/components/post-list/post-list';
import { BlogApi } from '../blog-api';
import { toPageNumber } from '../home/home-page';

/**
 * Posts de uma categoria (`/categorias/:slug`), com o feed RSS da categoria.
 */
@Component({
  selector: 'app-category-page',
  imports: [NotFound, PostList],
  templateUrl: './category-page.html',
})
export class CategoryPage {
  readonly slug = input.required<string>();
  readonly page = input(1, { transform: toPageNumber });

  private readonly api = inject(BlogApi);

  protected readonly category = this.api.category(() => this.slug());
  protected readonly posts = this.api.posts(() => ({ category: this.slug(), page: this.page() }));
  protected readonly data = computed(() =>
    this.category.hasValue() ? this.category.value()?.data : undefined,
  );
  protected readonly notFound = computed(() => {
    const error = this.category.error();

    return error instanceof HttpErrorResponse && error.status === 404;
  });
  protected readonly feedUrl = computed(
    () => `${environment.feedUrl}/categories/${encodeURIComponent(this.slug())}`,
  );

  constructor() {
    const seo = inject(SeoService);

    effect(() => {
      const category = this.data();

      if (category) {
        seo.update({
          title: category.name,
          description: category.description ?? `Posts da categoria ${category.name}.`,
          path: `/categorias/${category.slug}`,
          feed: { url: this.feedUrl(), title: `${environment.siteName} — ${category.name}` },
        });
      }
    });
  }
}
