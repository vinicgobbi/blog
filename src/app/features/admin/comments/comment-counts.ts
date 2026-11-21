import { Service, computed, inject } from '@angular/core';
import { AdminApi } from '../admin-api';

/**
 * Contagem de comentários por status, compartilhada entre o menu (badge de
 * pendentes) e a tela de moderação, que a recarrega após cada ação.
 */
@Service()
export class CommentCounts {
  readonly counts = inject(AdminApi).commentCounts();

  /** Pendentes; 0 enquanto carrega ou se a contagem falhar. */
  readonly pending = computed(() =>
    this.counts.hasValue() ? (this.counts.value()?.pending ?? 0) : 0,
  );

  reload(): void {
    this.counts.reload();
  }
}
