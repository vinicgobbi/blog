import { DatePipe, NgOptimizedImage } from '@angular/common';
import { Component, booleanAttribute, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PostSummary } from '../../models/blog';

/**
 * Resumo de um post nas listagens.
 */
@Component({
  selector: 'app-post-card',
  imports: [DatePipe, NgOptimizedImage, RouterLink],
  templateUrl: './post-card.html',
  styleUrl: './post-card.scss',
})
export class PostCard {
  readonly post = input.required<PostSummary>();
  /** Marca a imagem como prioritária (primeiro card visível, melhora o LCP). */
  readonly priority = input(false, { transform: booleanAttribute });
}
