import { handleInPageLinkClick, scrollToCurrentFragment } from './in-page-links';

describe('handleInPageLinkClick', () => {
  let link: HTMLAnchorElement;
  let target: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<a id="link" href="#secao">Ir</a><h2 id="secao">Seção</h2>';
    link = document.getElementById('link') as HTMLAnchorElement;
    target = document.getElementById('secao')!;
    target.scrollIntoView = vi.fn();
    history.replaceState(null, '', '/posts/meu-post');
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function click(init: MouseEventInit = {}): MouseEvent {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
    link.dispatchEvent(event);

    return event;
  }

  it('scrolls to the target on the current page instead of navigating to the site root', () => {
    document.addEventListener('click', (event) => handleInPageLinkClick(event, document), {
      once: true,
    });

    const event = click();

    expect(event.defaultPrevented).toBe(true);
    expect(target.scrollIntoView).toHaveBeenCalled();
    expect(location.pathname + location.hash).toBe('/posts/meu-post#secao');
  });

  it('moves focus to the target, making it focusable when needed', () => {
    document.addEventListener('click', (event) => handleInPageLinkClick(event, document), {
      once: true,
    });

    click();

    expect(document.activeElement).toBe(target);
    expect(target.getAttribute('tabindex')).toBe('-1');
  });

  it('ignores clicks with modifier keys so the browser can open new tabs', () => {
    document.addEventListener('click', (event) => handleInPageLinkClick(event, document), {
      once: true,
    });

    const event = click({ ctrlKey: true });

    expect(event.defaultPrevented).toBe(false);
    expect(target.scrollIntoView).not.toHaveBeenCalled();
  });

  it('ignores links whose target does not exist', () => {
    link.setAttribute('href', '#inexistente');
    document.addEventListener('click', (event) => handleInPageLinkClick(event, document), {
      once: true,
    });

    expect(click().defaultPrevented).toBe(false);
  });
});

describe('scrollToCurrentFragment', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    history.replaceState(null, '', '/');
  });

  it('scrolls to the element named in the URL fragment', () => {
    document.body.innerHTML = '<h2 id="secao-ola">Olá</h2>';
    const heading = document.getElementById('secao-ola')!;
    heading.scrollIntoView = vi.fn();
    history.replaceState(null, '', '/posts/x#secao-ola');

    expect(scrollToCurrentFragment(document)).toBe(true);
    expect(heading.scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement).not.toBe(heading);
  });

  it('does nothing when there is no fragment', () => {
    history.replaceState(null, '', '/posts/x');

    expect(scrollToCurrentFragment(document)).toBe(false);
  });
});
