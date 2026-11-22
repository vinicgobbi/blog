/**
 * Ajustes no HTML do post (gerado pela API a partir do Markdown) para que ele
 * continue completo depois do sanitizador do Angular, que é mantido como
 * segunda camada de proteção contra XSS.
 */

/**
 * O sanitizador remove `<input>`: as caixas das task lists do GFM viram os
 * caracteres ☑ / ☐ (com rótulo acessível) antes da sanitização.
 */
export function prepareArticleHtml(html: string): string {
  return html.replace(
    /<input (checked="" )?disabled="" type="checkbox">/g,
    (_, checked?: string) =>
      checked
        ? '<span class="task-box task-box--done" role="img" aria-label="Concluído">☑</span>'
        : '<span class="task-box" role="img" aria-label="Pendente">☐</span>',
  );
}

/**
 * O sanitizador também remove o `id` dos títulos, mas mantém o link de âncora
 * gerado pela API (`<a class="heading-permalink" href="#secao-...">`). O id é
 * recriado a partir dele, para que links como /posts/x#secao-y funcionem.
 */
export function restoreHeadingIds(container: HTMLElement): void {
  const anchors = container.querySelectorAll<HTMLAnchorElement>(
    ':is(h1, h2, h3, h4, h5, h6) > a.heading-permalink[href^="#"]',
  );

  for (const anchor of anchors) {
    const heading = anchor.parentElement;
    const id = decodeURIComponent(anchor.getAttribute('href')!.slice(1));

    if (heading && id && !heading.id) {
      heading.id = id;
    }
  }
}

/** Seção do post: um título `##` do Markdown, com o id da âncora gerada pela API. */
export interface ArticleSection {
  id: string;
  title: string;
}

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#039;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
};

/**
 * Lista as seções (`<h2>`) do HTML do post, na ordem do texto, para o sumário.
 * Trabalha sobre o texto do HTML (e não sobre o DOM) para funcionar também no
 * SSR. O id vem do link de âncora que a API põe em cada título; títulos sem ele
 * ficam de fora, pois não teriam para onde levar.
 */
export function extractSections(html: string): ArticleSection[] {
  const sections: ArticleSection[] = [];

  for (const [, inner] of html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)) {
    const href = /<a\b[^>]*class="heading-permalink"[^>]*>/i
      .exec(inner)?.[0]
      .match(/href="#([^"]+)"/i)?.[1];

    if (!href) {
      continue;
    }

    const title = inner
      .replace(/<a\b[^>]*class="heading-permalink"[^>]*>[\s\S]*?<\/a>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&(?:amp|lt|gt|quot|nbsp|#0?39);/g, (entity) => HTML_ENTITIES[entity] ?? entity)
      .replace(/\s+/g, ' ')
      .trim();

    if (title) {
      sections.push({ id: decodeURIComponent(href), title });
    }
  }

  return sections;
}
