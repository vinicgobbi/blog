import { Component, inject } from '@angular/core';
import { HttpResourceRef } from '@angular/common/http';
import { SeoService } from '../../../core/seo/seo.service';
import { AdminApi } from '../admin-api';

interface StatCard {
  label: string;
  icon: string;
  value: HttpResourceRef<number | undefined>;
}

/**
 * Painel inicial do admin: posts por situação e comentários pendentes.
 */
@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  private readonly api = inject(AdminApi);

  protected readonly comments = this.api.commentCounts();
  protected readonly cards: StatCard[] = [
    { label: 'Publicados', icon: 'bi-check2-circle', value: this.api.postCount('published') },
    { label: 'Agendados', icon: 'bi-calendar-event', value: this.api.postCount('scheduled') },
    { label: 'Rascunhos', icon: 'bi-pencil-square', value: this.api.postCount('draft') },
  ];

  constructor() {
    inject(SeoService).update({ title: 'Dashboard', path: '/admin', noindex: true });
  }

  /** `value()` lança erro quando o recurso falhou. */
  protected count(resource: HttpResourceRef<number | undefined>): string {
    if (resource.error()) {
      return '—';
    }

    return resource.hasValue() ? String(resource.value() ?? 0) : '…';
  }

  protected pending(): string {
    if (this.comments.error()) {
      return '—';
    }

    return this.comments.hasValue() ? String(this.comments.value()?.pending ?? 0) : '…';
  }
}
