import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeoService } from '../../../core/seo/seo.service';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { AdminPost, PostState } from '../../../shared/models/admin';
import { toPageNumber } from '../../blog/home/home-page';
import { AdminApi } from '../admin-api';

export const STATE_LABELS: Record<PostState, string> = {
  published: 'Publicado',
  scheduled: 'Agendado',
  draft: 'Rascunho',
};

const STATES = Object.keys(STATE_LABELS) as PostState[];

/**
 * Lista de posts do admin (`/admin/posts`), com filtro por situação e busca.
 */
@Component({
  selector: 'app-post-list-page',
  imports: [DatePipe, RouterLink, Pagination],
  templateUrl: './post-list-page.html',
  styleUrls: ['../admin-list.scss', './post-list-page.scss'],
})
export class PostListPage {
  /** Query params `?state=`, `?q=` e `?page=`. */
  readonly state = input<PostState | undefined, unknown>(undefined, {
    transform: (value: unknown) =>
      STATES.includes(value as PostState) ? (value as PostState) : undefined,
  });
  readonly q = input('', { transform: (value: unknown) => String(value ?? '').trim() });
  readonly page = input(1, { transform: toPageNumber });

  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);

  protected readonly states = STATES;
  protected readonly labels = STATE_LABELS;
  protected readonly posts = this.api.posts(() => ({
    state: this.state(),
    q: this.q(),
    page: this.page(),
  }));
  protected readonly response = computed(() =>
    this.posts.hasValue() ? this.posts.value() : undefined,
  );
  protected readonly deleteError = signal<string | null>(null);

  constructor() {
    inject(SeoService).update({ title: 'Posts', path: '/admin/posts', noindex: true });
  }

  protected filter(changes: { state?: string; q?: string }): void {
    void this.router.navigate([], {
      queryParams: { ...changes, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected search(event: Event, term: string): void {
    event.preventDefault();
    this.filter({ q: term.trim() || undefined });
  }

  protected async remove(post: AdminPost): Promise<void> {
    if (!confirm(`Mover "${post.title}" para a lixeira? Ele sai do blog imediatamente.`)) {
      return;
    }

    this.deleteError.set(null);

    try {
      await firstValueFrom(this.api.deletePost(post.id));
      this.posts.reload();
    } catch {
      this.deleteError.set(`Não foi possível excluir "${post.title}". Tente novamente.`);
    }
  }
}
