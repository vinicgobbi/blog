import { DatePipe, NgOptimizedImage } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DOCUMENT,
  ElementRef,
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
import { NotFound } from '../../../shared/components/not-found/not-found';
import { BlogApi } from '../blog-api';
import { PostComments } from './comments/post-comments';
import { extractSections, prepareArticleHtml, restoreHeadingIds } from './article-html';
import { TableOfContents } from './table-of-contents/table-of-contents';

/**
 * Página de um post publicado (`/posts/:slug`).
 */
@Component({
  selector: 'app-post-page',
  imports: [DatePipe, NgOptimizedImage, RouterLink, PostComments, NotFound, TableOfContents],
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
  /** Seções `##` do post para o sumário, que só aparece a partir de duas. */
  protected readonly sections = computed(() => extractSections(this.data()?.body_html ?? ''));
  protected readonly minSections = 2;

  private readonly content = viewChild<ElementRef<HTMLElement>>('content');

  constructor() {
    const seo = inject(SeoService);
    const document = inject(DOCUMENT);

    effect(() => {
      const post = this.data();

      if (post) {
        seo.update({
          title: post.title,
          description: post.excerpt ?? undefined,
          image: post.cover_image_url,
          imageAlt: post.title,
          path: `/posts/${post.slug}`,
          type: 'article',
          article: { publishedTime: post.published_at, modifiedTime: post.updated_at },
        });
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
