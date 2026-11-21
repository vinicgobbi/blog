import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { SeoService } from '../../../core/seo/seo.service';
import { NotFound } from '../../../shared/components/not-found/not-found';
import { BlogApi } from '../blog-api';
import { prepareArticleHtml, restoreHeadingIds } from '../post/article-html';

/**
 * Página estática escrita em Markdown no admin (ex.: `/sobre`).
 */
@Component({
  selector: 'app-static-page',
  imports: [NotFound],
  templateUrl: './static-page.html',
})
export class StaticPageComponent {
  readonly slug = input.required<string>();

  protected readonly page = inject(BlogApi).page(() => this.slug());
  protected readonly data = computed(() =>
    this.page.hasValue() ? this.page.value()?.data : undefined,
  );
  protected readonly notFound = computed(() => {
    const error = this.page.error();

    return error instanceof HttpErrorResponse && error.status === 404;
  });
  protected readonly bodyHtml = computed(() => prepareArticleHtml(this.data()?.body_html ?? ''));

  private readonly content = viewChild<ElementRef<HTMLElement>>('content');

  constructor() {
    const seo = inject(SeoService);

    effect(() => {
      const page = this.data();

      if (page) {
        seo.update({ title: page.title, path: `/${page.slug}` });
      }
    });

    afterRenderEffect(() => {
      this.bodyHtml();
      const element = this.content()?.nativeElement;

      if (element) {
        restoreHeadingIds(element);
      }
    });
  }
}
