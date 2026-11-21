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
