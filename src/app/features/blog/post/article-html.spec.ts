import { extractSections, prepareArticleHtml, restoreHeadingIds } from './article-html';

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

describe('extractSections', () => {
  it('lists the h2 to h4 headings with their level and permalink id, in order', () => {
    const html =
      '<h2 id="secao-intro">Introdução<a href="#secao-intro" class="heading-permalink" aria-hidden="true">#</a></h2>' +
      '<p>texto</p><h3 id="secao-sub">Sub<a href="#secao-sub" class="heading-permalink">#</a></h3>' +
      '<h4 id="secao-detalhe">Detalhe<a href="#secao-detalhe" class="heading-permalink">#</a></h4>' +
      '<h2 id="secao-uso">Uso<a href="#secao-uso" class="heading-permalink">#</a></h2>';

    expect(extractSections(html)).toEqual([
      { id: 'secao-intro', title: 'Introdução', level: 2 },
      { id: 'secao-sub', title: 'Sub', level: 3 },
      { id: 'secao-detalhe', title: 'Detalhe', level: 4 },
      { id: 'secao-uso', title: 'Uso', level: 2 },
    ]);
  });

  it('leaves headings deeper than h4 out of the list', () => {
    const html =
      '<h2>Topo<a href="#secao-topo" class="heading-permalink">#</a></h2>' +
      '<h5>Fundo<a href="#secao-fundo" class="heading-permalink">#</a></h5>' +
      '<h6>Mais fundo<a href="#secao-mais-fundo" class="heading-permalink">#</a></h6>';

    expect(extractSections(html)).toEqual([{ id: 'secao-topo', title: 'Topo', level: 2 }]);
  });

  it('keeps only the text of headings with inline markup and decodes entities', () => {
    const html =
      '<h2>Usando <code>&lt;router-outlet&gt;</code> &amp; <em>rotas</em>' +
      '<a href="#secao-usando-router-outlet-rotas" class="heading-permalink">#</a></h2>';

    expect(extractSections(html)).toEqual([
      { id: 'secao-usando-router-outlet-rotas', title: 'Usando <router-outlet> & rotas', level: 2 },
    ]);
  });

  it('ignores headings without a permalink and posts without sections', () => {
    expect(extractSections('<h2>Sem âncora</h2><p>texto</p>')).toEqual([]);
    expect(extractSections('<p>Só um parágrafo</p>')).toEqual([]);
  });
});
