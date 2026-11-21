import { DatePipe, NgOptimizedImage } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DOCUMENT,
  ElementRef,
  RESPONSE_INIT,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { scrollToCurrentFragment } from '../../../core/navigation/in-page-links';
import { SeoService } from '../../../core/seo/seo.service';
import { BlogApi } from '../blog-api';
import { PostComments } from './comments/post-comments';
import { prepareArticleHtml, restoreHeadingIds } from './article-html';

/**
 * Página de um post publicado (`/posts/:slug`).
 */
@Component({
  selector: 'app-post-page',
  imports: [DatePipe, NgOptimizedImage, RouterLink, PostComments],
  templateUrl: './post-page.html',
  styleUrl: './post-page.scss',
})
export class PostPage {
  /** Preenchido pelo parâmetro de rota `:slug` (withComponentInputBinding). */
  readonly slug = input.required<string>();

  protected readonly post = inject(BlogApi).post(() => this.slug());
  /** `value()` lança erro quando o recurso falhou; por isso a checagem com `hasValue()`. */
  protected readonly data = computed(() =>
    this.post.hasValue() ? this.post.value()?.data : undefined,
  );
  protected readonly notFound = computed(() => {
    const error = this.post.error();

    return error instanceof HttpErrorResponse && error.status === 404;
  });
  protected readonly bodyHtml = computed(() => prepareArticleHtml(this.data()?.body_html ?? ''));

  private readonly content = viewChild<ElementRef<HTMLElement>>('content');

  constructor() {
    const seo = inject(SeoService);
    const response = inject(RESPONSE_INIT, { optional: true });
    const document = inject(DOCUMENT);

    effect(() => {
      const post = this.data();

      if (post) {
        seo.update({
          title: post.title,
          description: post.excerpt ?? undefined,
          image: post.cover_image_url,
          path: `/posts/${post.slug}`,
          type: 'article',
        });
      } else if (this.notFound()) {
        seo.update({ title: 'Post não encontrado' });

        if (response) {
          response.status = 404;
        }
      }
    });

    afterRenderEffect(() => {
      this.bodyHtml();
      const element = this.content()?.nativeElement;

      if (element) {
        restoreHeadingIds(element);
        scrollToCurrentFragment(document);
      }
    });
  }
}
