/**
 * Links para âncoras da própria página (`href="#id"`).
 *
 * Com `<base href="/">`, o navegador resolve "#id" a partir da raiz: em
 * /posts/x, o link levaria para /#id (a home). Aqui o clique é tratado na
 * página atual: rola até o elemento, move o foco (essencial para o link
 * "Pular para o conteúdo") e atualiza só o fragmento da URL.
 *
 * Retorna true quando o clique foi tratado.
 */
export function handleInPageLinkClick(event: MouseEvent, document: Document): boolean {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return false;
  }

  const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
  const id = link ? decodeURIComponent(link.getAttribute('href')!.slice(1)) : '';
  const target = id ? document.getElementById(id) : null;

  if (!target) {
    return false;
  }

  event.preventDefault();
  scrollToElement(target);

  const { pathname, search } = document.location;
  document.defaultView?.history.replaceState(
    document.defaultView.history.state,
    '',
    `${pathname}${search}#${encodeURIComponent(id)}`,
  );

  return true;
}

/**
 * Rola até o fragmento atual da URL, se o elemento existir (ex.: ao abrir
 * /posts/x#secao-y depois que o conteúdo foi renderizado).
 */
export function scrollToCurrentFragment(document: Document): boolean {
  const id = decodeURIComponent(document.location.hash.slice(1));
  const target = id ? document.getElementById(id) : null;

  if (target) {
    scrollToElement(target);
  }

  return target !== null;
}

function scrollToElement(target: HTMLElement): void {
  target.scrollIntoView?.();

  if (
    !target.hasAttribute('tabindex') &&
    !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(target.tagName)
  ) {
    target.setAttribute('tabindex', '-1');
  }
  target.focus({ preventScroll: true });
}
