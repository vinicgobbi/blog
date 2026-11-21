import { Component, inject } from '@angular/core';
import { SeoService } from '../../../core/seo/seo.service';
import { MediaLibrary } from './media-library';

/** Gestão das imagens enviadas (`/admin/midia`). */
@Component({
  selector: 'app-media-page',
  imports: [MediaLibrary],
  template: `
    <header class="section-header">
      <span class="eyebrow">Admin</span>
      <h1 class="section-title">Mídia</h1>
      <p class="section-subtitle">
        Envie imagens e copie o Markdown para usar nos posts. Imagens em uso não podem ser
        excluídas.
      </p>
    </header>
    <app-media-library />
  `,
})
export class MediaPage {
  constructor() {
    inject(SeoService).update({ title: 'Mídia', path: '/admin/midia', noindex: true });
  }
}
