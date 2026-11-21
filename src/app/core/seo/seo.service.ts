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
  /** Pede aos buscadores para não indexar a página (ex.: busca, páginas de erro). */
  noindex?: boolean;
  /** Feed RSS anunciado pela página; o feed geral do blog é usado quando omitido. */
  feed?: { url: string; title: string };
}

/**
 * Define título, description, canonical, robots, feed RSS e as tags Open Graph/Twitter.
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

    const feed = data.feed ?? { url: environment.feedUrl, title: environment.siteName };

    this.title.setTitle(title);
    this.setLink('link[rel="canonical"]', { rel: 'canonical', href: url });
    this.setLink('link[rel="alternate"][type="application/rss+xml"]', {
      rel: 'alternate',
      type: 'application/rss+xml',
      title: feed.title,
      href: feed.url,
    });
    this.setTag('name', 'robots', data.noindex ? 'noindex, follow' : null);

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

  /** Cria ou atualiza um único <link> no <head> (evita duplicatas entre páginas). */
  private setLink(selector: string, attributes: Record<string, string>): void {
    let link = this.document.head.querySelector<HTMLLinkElement>(selector);

    if (!link) {
      link = this.document.createElement('link');
      this.document.head.appendChild(link);
    }

    for (const [name, value] of Object.entries(attributes)) {
      link.setAttribute(name, value);
    }
  }
}
