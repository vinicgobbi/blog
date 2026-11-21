import { EditorState, applyMarkdown } from './markdown-actions';

/**
 * Nos testes, a seleção é marcada com « e » (colchetes conflitariam com a
 * sintaxe de links do Markdown).
 */
function state(marked: string): EditorState {
  const start = marked.indexOf('«');
  const end = marked.indexOf('»') - 1;

  return { value: marked.replace('«', '').replace('»', ''), start, end };
}

function show(result: EditorState): string {
  const { value, start, end } = result;

  return `${value.slice(0, start)}«${value.slice(start, end)}»${value.slice(end)}`;
}

describe('applyMarkdown', () => {
  it('wraps the selection in bold and keeps it selected', () => {
    expect(show(applyMarkdown('bold', state('um «texto» aqui')))).toBe('um **«texto»** aqui');
  });

  it('inserts a selected placeholder when nothing is selected', () => {
    expect(show(applyMarkdown('italic', state('fim«»')))).toBe('fim_«texto em itálico»_');
  });

  it('removes the formatting when applied again (toggle)', () => {
    expect(show(applyMarkdown('bold', state('um **«texto»** aqui')))).toBe('um «texto» aqui');
    expect(show(applyMarkdown('code', state('`«x»`')))).toBe('«x»');
  });

  it('turns the current line into a heading and back', () => {
    const heading = applyMarkdown('heading', state('linha 1\nlin«»ha 2'));
    expect(show(heading)).toBe('linha 1\n«## linha 2»');

    expect(show(applyMarkdown('heading', heading))).toBe('linha 1\n«linha 2»');
  });

  it('prefixes every selected line in lists and quotes', () => {
    expect(show(applyMarkdown('bulletList', state('«a\nb»')))).toBe('«- a\n- b»');
    expect(show(applyMarkdown('orderedList', state('«a\nb\nc»')))).toBe('«1. a\n2. b\n3. c»');
    expect(show(applyMarkdown('quote', state('«citação»')))).toBe('«> citação»');
  });

  it('turns the selection into a link label and selects the URL', () => {
    expect(show(applyMarkdown('link', state('veja «este site»')))).toBe(
      'veja [este site](«https://»)',
    );
  });

  it('inserts an image template with the URL selected', () => {
    expect(show(applyMarkdown('image', state('«»')))).toBe('![descrição da imagem](«https://»)');
  });

  it('wraps code blocks in fences on their own lines', () => {
    expect(show(applyMarkdown('codeBlock', state('texto «echo 1;»')))).toBe(
      'texto \n```\n«echo 1;»\n```\n',
    );
  });
});
