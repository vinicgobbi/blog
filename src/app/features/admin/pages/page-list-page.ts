import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeoService } from '../../../core/seo/seo.service';
import { AdminPage } from '../../../shared/models/admin';
import { AdminApi } from '../admin-api';

/**
 * Lista de páginas estáticas do admin (`/admin/paginas`), como "Sobre".
 */
@Component({
  selector: 'app-page-list-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './page-list-page.html',
  styleUrl: '../admin-list.scss',
})
export class PageListPage {
  private readonly api = inject(AdminApi);

  protected readonly pages = this.api.pages();
  protected readonly deleteError = signal<string | null>(null);

  constructor() {
    inject(SeoService).update({ title: 'Páginas', path: '/admin/paginas', noindex: true });
  }

  protected async remove(page: AdminPage): Promise<void> {
    const warning = page.is_published ? ' Ela sai do blog imediatamente.' : '';

    if (!confirm(`Excluir a página "${page.title}"?${warning} Esta ação não pode ser desfeita.`)) {
      return;
    }

    this.deleteError.set(null);

    try {
      await firstValueFrom(this.api.deletePage(page.id));
      this.pages.reload();
    } catch {
      this.deleteError.set(`Não foi possível excluir "${page.title}". Tente novamente.`);
    }
  }
}
