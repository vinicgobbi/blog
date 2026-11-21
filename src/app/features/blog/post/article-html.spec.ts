import { prepareArticleHtml, restoreHeadingIds } from './article-html';

describe('prepareArticleHtml', () => {
  it('replaces GFM task list checkboxes with accessible symbols', () => {
    const html =
      '<ul><li><input checked="" disabled="" type="checkbox"> feito</li><li><input disabled="" type="checkbox"> pendente</li></ul>';

    const result = prepareArticleHtml(html);

    expect(result).not.toContain('<input');
    expect(result).toContain('aria-label="Concluído">☑</span> feito');
    expect(result).toContain('aria-label="Pendente">☐</span> pendente');
  });

  it('leaves other markup untouched', () => {
    const html = '<h2>Título</h2><p>Texto <code>&lt;input&gt;</code></p>';

    expect(prepareArticleHtml(html)).toBe(html);
  });
});

describe('restoreHeadingIds', () => {
  function container(html: string): HTMLElement {
    const element = document.createElement('div');
    element.innerHTML = html;

    return element;
  }

  it('sets heading ids from their permalink anchors', () => {
    const element = container(
      '<h2>Introdução<a class="heading-permalink" href="#secao-introducao">#</a></h2>' +
        '<h3>Detalhes<a class="heading-permalink" href="#secao-detalhes">#</a></h3>',
    );

    restoreHeadingIds(element);

    expect([...element.querySelectorAll('h2, h3')].map((heading) => heading.id)).toEqual([
      'secao-introducao',
      'secao-detalhes',
    ]);
  });

  it('keeps an existing id and ignores anchors outside headings', () => {
    const element = container(
      '<h2 id="ja-existe">A<a class="heading-permalink" href="#outro">#</a></h2>' +
        '<p>Veja <a class="heading-permalink" href="#paragrafo">aqui</a></p>',
    );

    restoreHeadingIds(element);

    expect(element.querySelector('h2')?.id).toBe('ja-existe');
    expect(element.querySelector('p')?.id).toBe('');
  });
});
