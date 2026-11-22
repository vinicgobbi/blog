import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { SeoService } from '../../../core/seo/seo.service';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { AdminComment, CommentStatus } from '../../../shared/models/admin';
import { toPageNumber } from '../../blog/home/home-page';
import { AdminApi } from '../admin-api';
import { CommentCounts } from './comment-counts';

/** Filtro da tela: um status ou todos. */
export type CommentFilter = CommentStatus | 'all';

export const COMMENT_FILTERS: { value: CommentFilter; label: string }[] = [
  { value: 'pending', label: 'Pendentes' },
  { value: 'approved', label: 'Aprovados' },
  { value: 'rejected', label: 'Rejeitados' },
  { value: 'spam', label: 'Spam' },
  { value: 'all', label: 'Todos' },
];

export const COMMENT_STATUS_LABELS: Record<CommentStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  spam: 'Spam',
};

/** Ações de moderação, na ordem exibida; a do status atual fica oculta. */
const ACTIONS: { status: CommentStatus; label: string; icon: string; done: string }[] = [
  { status: 'approved', label: 'Aprovar', icon: 'bi-check-lg', done: 'Comentário aprovado.' },
  { status: 'rejected', label: 'Rejeitar', icon: 'bi-x-lg', done: 'Comentário rejeitado.' },
  {
    status: 'spam',
    label: 'Marcar como spam',
    icon: 'bi-slash-circle',
    done: 'Comentário marcado como spam.',
  },
  {
    status: 'pending',
    label: 'Voltar para pendente',
    icon: 'bi-arrow-counterclockwise',
    done: 'Comentário voltou para pendente.',
  },
];

const FILTER_VALUES = COMMENT_FILTERS.map((filter) => filter.value);

/**
 * Moderação de comentários (`/admin/comentarios`). Mostra os pendentes por
 * padrão; `?status=` escolhe outro filtro (ou `all`).
 */
@Component({
  selector: 'app-comment-list-page',
  imports: [DatePipe, RouterLink, Pagination],
  templateUrl: './comment-list-page.html',
  styleUrls: ['../admin-list.scss', './comment-list-page.scss'],
})
export class CommentListPage {
  /** Query params `?status=` e `?page=`. */
  readonly status = input<CommentFilter, unknown>('pending', {
    transform: (value: unknown) =>
      FILTER_VALUES.includes(value as CommentFilter) ? (value as CommentFilter) : 'pending',
  });
  readonly page = input(1, { transform: toPageNumber });

  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly counts = inject(CommentCounts);

  protected readonly filters = COMMENT_FILTERS;
  protected readonly statusLabels = COMMENT_STATUS_LABELS;
  protected readonly comments = this.api.comments(() => {
    const status = this.status();

    return { status: status === 'all' ? undefined : status, page: this.page() };
  });
  protected readonly response = computed(() =>
    this.comments.hasValue() ? this.comments.value() : undefined,
  );
  /** Comentários com uma ação em andamento (botões desabilitados). */
  protected readonly busy = signal<ReadonlySet<number>>(new Set());

  constructor() {
    inject(SeoService).update({
      title: 'Comentários',
      path: '/admin/comentarios',
      noindex: true,
    });
    // Ao abrir a tela, a contagem do menu é atualizada junto com a lista.
    this.counts.reload();
  }

  protected actionsFor(comment: AdminComment) {
    return ACTIONS.filter((action) => action.status !== comment.status);
  }

  protected countFor(filter: CommentFilter): number | null {
    if (!this.counts.counts.hasValue()) {
      return null;
    }
    const counts = this.counts.counts.value();

    if (!counts) {
      return null;
    }

    return filter === 'all'
      ? Object.values(counts).reduce((total, count) => total + count, 0)
      : counts[filter];
  }

  protected filter(value: CommentFilter): void {
    void this.router.navigate([], {
      queryParams: { status: value === 'pending' ? null : value, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected async moderate(comment: AdminComment, status: CommentStatus): Promise<void> {
    const action = ACTIONS.find((item) => item.status === status)!;

    await this.run(comment, action.done, () => this.api.updateCommentStatus(comment.id, status));
  }

  protected async remove(comment: AdminComment): Promise<void> {
    if (
      !confirm(
        `Excluir definitivamente o comentário de "${comment.author_name}"? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    await this.run(comment, 'Comentário excluído.', () => this.api.deleteComment(comment.id));
  }

  private async run(
    comment: AdminComment,
    done: string,
    request: () => Observable<unknown>,
  ): Promise<void> {
    this.setBusy(comment.id, true);

    try {
      await firstValueFrom(request());
      this.toast.success(done);
      this.comments.reload();
      this.counts.reload();
    } catch {
      this.toast.error(
        `Não foi possível atualizar o comentário de "${comment.author_name}". Tente novamente.`,
      );
    } finally {
      this.setBusy(comment.id, false);
    }
  }

  private setBusy(id: number, value: boolean): void {
    this.busy.update((ids) => {
      const next = new Set(ids);
      if (value) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });
  }
}
