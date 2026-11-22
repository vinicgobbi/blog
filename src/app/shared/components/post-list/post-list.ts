import { Component, computed, effect, input, signal } from '@angular/core';
import { HttpResourceRef } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { PaginatedResponse } from '../../models/api';
import { PostSummary } from '../../models/blog';
import { Pagination } from '../pagination/pagination';
import { PostCard } from '../post-card/post-card';

/**
 * Grade de posts com paginação e os estados de carregando, vazio e erro.
 * Usada pela home e pelas listagens por tag, categoria e busca.
 *
 * Enquanto carrega, mostra cartões-esqueleto no formato dos posts; quando o
 * conteúdo chega, os cartões entram em sequência no lugar deles.
 */
@Component({
  selector: 'app-post-list',
  imports: [PostCard, Pagination, RouterLink],
  templateUrl: './post-list.html',
  styleUrl: './post-list.scss',
})
export class PostList {
  readonly posts = input.required<HttpResourceRef<PaginatedResponse<PostSummary> | undefined>>();
  readonly page = input(1);
  /** Mensagem quando a primeira página não tem posts. */
  readonly emptyMessage = input('Nenhum post publicado ainda.');

  /** Quantidade de cartões-esqueleto: duas linhas da grade na maioria das telas. */
  protected readonly skeletonCards = [1, 2, 3, 4, 5, 6];

  /**
   * Os cartões só entram com animação depois do esqueleto. Na primeira carga
   * vinda do SSR o conteúdo já está na página e não deve "piscar".
   */
  protected readonly revealAfterSkeleton = signal(false);

  constructor() {
    effect(() => {
      if (this.posts().isLoading() && !this.response()) {
        this.revealAfterSkeleton.set(true);
      }
    });
  }

  /** `value()` lança erro quando o recurso falhou; por isso a checagem com `hasValue()`. */
  protected readonly response = computed(() => {
    const posts = this.posts();

    return posts.hasValue() ? posts.value() : undefined;
  });
}
