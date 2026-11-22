import { DOCUMENT } from '@angular/common';
import { Service, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

export interface SeoData {
  /** Título da página; o nome do site é acrescentado automaticamente. */
  title?: string;
  /** Resumo da página; a descrição do site é usada quando omitido. */
  description?: string;
  /**
   * URL absoluta da imagem de compartilhamento (ex.: capa do post). Sem imagem, ou com
   * uma imagem SVG (que WhatsApp, Facebook, LinkedIn e X não exibem), usa a imagem padrão.
   */
  image?: string | null;
  /** Texto alternativo da imagem de compartilhamento. */
  imageAlt?: string;
  /** Datas ISO 8601 do artigo, publicadas como `article:published_time` e `article:modified_time`. */
  article?: { publishedTime: string; modifiedTime?: string };
  /** Caminho da página (ex.: `/posts/meu-post`), usado no canonical e no og:url. */
  path?: string;
  type?: 'website' | 'article';
  /** Pede aos buscadores para não indexar a página (ex.: busca, páginas de erro). */
  noindex?: boolean;
  /** Feed RSS anunciado pela página; o feed geral do blog é usado quando omitido. */
  feed?: { url: string; title: string };
}

/** Imagem de compartilhamento padrão (public/og-image.png), no tamanho recomendado de 1200×630. */
export const DEFAULT_SHARE_IMAGE = {
  url: `${environment.siteUrl}/og-image.png`,
  width: 1200,
  height: 630,
};

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

    const description = data.description || environment.siteDescription.trim();
    const hasOwnImage = !!data.image && !isSvg(data.image);
    const image = hasOwnImage ? data.image : DEFAULT_SHARE_IMAGE.url;
    const imageAlt = (hasOwnImage && data.imageAlt) || environment.siteName;

    this.setTag('name', 'description', description);
    this.setTag('property', 'og:site_name', environment.siteName);
    this.setTag('property', 'og:title', title);
    this.setTag('property', 'og:description', description);
    this.setTag('property', 'og:type', data.type ?? 'website');
    this.setTag('property', 'og:url', url);
    this.setTag('property', 'og:image', image);
    this.setTag('property', 'og:image:alt', imageAlt);
    // As dimensões só são conhecidas para a imagem padrão; com elas o preview aparece já no primeiro compartilhamento.
    this.setTag('property', 'og:image:width', hasOwnImage ? null : `${DEFAULT_SHARE_IMAGE.width}`);
    this.setTag(
      'property',
      'og:image:height',
      hasOwnImage ? null : `${DEFAULT_SHARE_IMAGE.height}`,
    );
    this.setTag('property', 'article:published_time', data.article?.publishedTime);
    this.setTag('property', 'article:modified_time', data.article?.modifiedTime);
    this.setTag('name', 'twitter:card', 'summary_large_image');
    this.setTag('name', 'twitter:title', title);
    this.setTag('name', 'twitter:description', description);
    this.setTag('name', 'twitter:image', image);
    this.setTag('name', 'twitter:image:alt', imageAlt);
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

/** Indica se a URL aponta para um SVG, ignorando query string e fragmento. */
function isSvg(url: string): boolean {
  return /\.svg$/i.test(url.split(/[?#]/)[0]);
}
