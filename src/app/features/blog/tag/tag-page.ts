import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { SeoService } from '../../../core/seo/seo.service';
import { NotFound } from '../../../shared/components/not-found/not-found';
import { PostList } from '../../../shared/components/post-list/post-list';
import { BlogApi } from '../blog-api';
import { toPageNumber } from '../home/home-page';

/**
 * Posts de uma tag (`/tags/:slug`), com o feed RSS da tag.
 */
@Component({
  selector: 'app-tag-page',
  imports: [NotFound, PostList],
  templateUrl: './tag-page.html',
})
export class TagPage {
  readonly slug = input.required<string>();
  readonly page = input(1, { transform: toPageNumber });

  private readonly api = inject(BlogApi);

  protected readonly tag = this.api.tag(() => this.slug());
  protected readonly posts = this.api.posts(() => ({ tag: this.slug(), page: this.page() }));
  protected readonly data = computed(() =>
    this.tag.hasValue() ? this.tag.value()?.data : undefined,
  );
  protected readonly notFound = computed(() => {
    const error = this.tag.error();

    return error instanceof HttpErrorResponse && error.status === 404;
  });
  protected readonly feedUrl = computed(
    () => `${environment.feedUrl}/tags/${encodeURIComponent(this.slug())}`,
  );

  constructor() {
    const seo = inject(SeoService);

    effect(() => {
      const tag = this.data();

      if (tag) {
        seo.update({
          title: `#${tag.name}`,
          description: `Posts com a tag ${tag.name} no ${environment.siteName}.`,
          path: `/tags/${tag.slug}`,
          feed: { url: this.feedUrl(), title: `${environment.siteName} — #${tag.name}` },
        });
      }
    });
  }
}
