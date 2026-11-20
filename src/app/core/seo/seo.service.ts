import { DOCUMENT } from '@angular/common';
import { Service, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

export interface SeoData {
  /** Título da página; o nome do site é acrescentado automaticamente. */
  title?: string;
  description?: string;
  /** URL absoluta da imagem de compartilhamento (ex.: capa do post). */
  image?: string | null;
  /** Caminho da página (ex.: `/posts/meu-post`), usado no canonical e no og:url. */
  path?: string;
  type?: 'website' | 'article';
}

/**
 * Define título, description, canonical e as tags Open Graph/Twitter.
 * Funciona no SSR, então as tags já chegam prontas para buscadores e para
 * o preview de links em redes sociais.
 */
@Service()
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  update(data: SeoData): void {
    const title = data.title ? `${data.title} | ${environment.siteName}` : environment.siteName;
    const url = `${environment.siteUrl}${data.path ?? ''}`;

    this.title.setTitle(title);
    this.setCanonical(url);

    this.setTag('name', 'description', data.description);
    this.setTag('property', 'og:site_name', environment.siteName);
    this.setTag('property', 'og:title', title);
    this.setTag('property', 'og:description', data.description);
    this.setTag('property', 'og:type', data.type ?? 'website');
    this.setTag('property', 'og:url', url);
    this.setTag('property', 'og:image', data.image);
    this.setTag('name', 'twitter:card', data.image ? 'summary_large_image' : 'summary');
    this.setTag('name', 'twitter:title', title);
    this.setTag('name', 'twitter:description', data.description);
    this.setTag('name', 'twitter:image', data.image);
  }

  /** Atualiza a tag, ou a remove quando não há valor (evita dados da página anterior). */
  private setTag(
    attribute: 'name' | 'property',
    key: string,
    content: string | null | undefined,
  ): void {
    if (content) {
      this.meta.updateTag({ [attribute]: key, content });
    } else {
      this.meta.removeTag(`${attribute}="${key}"`);
    }
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }

    link.setAttribute('href', url);
  }
}
