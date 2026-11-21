/** Texto do editor com a seleção atual (índices como em HTMLTextAreaElement). */
export interface EditorState {
  value: string;
  start: number;
  end: number;
}

export type MarkdownAction =
  | 'bold'
  | 'italic'
  | 'heading'
  | 'link'
  | 'bulletList'
  | 'orderedList'
  | 'quote'
  | 'code'
  | 'codeBlock'
  | 'image';

/** Marcadores que envolvem a seleção (aplicar de novo remove). */
const WRAPPERS: Partial<Record<MarkdownAction, { marker: string; placeholder: string }>> = {
  bold: { marker: '**', placeholder: 'texto em negrito' },
  italic: { marker: '_', placeholder: 'texto em itálico' },
  code: { marker: '`', placeholder: 'código' },
};

/** Prefixos aplicados a cada linha da seleção (aplicar de novo remove). */
const LINE_PREFIXES: Partial<Record<MarkdownAction, (index: number) => string>> = {
  heading: () => '## ',
  quote: () => '> ',
  bulletList: () => '- ',
  orderedList: (index) => `${index + 1}. `,
};

/**
 * Aplica uma ação da toolbar ao texto do editor e devolve o novo texto com a
 * seleção ajustada (ex.: o placeholder fica selecionado para ser sobrescrito).
 */
export function applyMarkdown(action: MarkdownAction, state: EditorState): EditorState {
  const wrapper = WRAPPERS[action];
  if (wrapper) {
    return toggleWrap(state, wrapper.marker, wrapper.placeholder);
  }

  const prefix = LINE_PREFIXES[action];
  if (prefix) {
    return toggleLinePrefix(state, prefix);
  }

  switch (action) {
    case 'link':
      return insertTemplate(state, '[', '](https://)', 'texto do link', 'https://');
    case 'image':
      return insertTemplate(state, '![', '](https://)', 'descrição da imagem', 'https://');
    default:
      return insertCodeBlock(state);
  }
}

function toggleWrap(state: EditorState, marker: string, placeholder: string): EditorState {
  const { value, start, end } = state;
  const before = value.slice(start - marker.length, start);
  const after = value.slice(end, end + marker.length);

  // Seleção já envolvida pelo marcador: remove a formatação.
  if (start >= marker.length && before === marker && after === marker) {
    return {
      value:
        value.slice(0, start - marker.length) +
        value.slice(start, end) +
        value.slice(end + marker.length),
      start: start - marker.length,
      end: end - marker.length,
    };
  }

  const selected = value.slice(start, end) || placeholder;

  return {
    value: value.slice(0, start) + marker + selected + marker + value.slice(end),
    start: start + marker.length,
    end: start + marker.length + selected.length,
  };
}

function toggleLinePrefix(state: EditorState, prefixFor: (index: number) => string): EditorState {
  const { value } = state;
  const lineStart = value.lastIndexOf('\n', state.start - 1) + 1;
  const nextBreak = value.indexOf(
    '\n',
    Math.max(state.end - (state.end > state.start ? 1 : 0), state.start),
  );
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;

  const lines = value.slice(lineStart, lineEnd).split('\n');
  const prefixed = lines.every((line, index) => line.startsWith(prefixFor(index)));
  const updated = lines.map((line, index) =>
    prefixed ? line.slice(prefixFor(index).length) : prefixFor(index) + line,
  );
  const block = updated.join('\n');

  return {
    value: value.slice(0, lineStart) + block + value.slice(lineEnd),
    start: lineStart,
    end: lineStart + block.length,
  };
}

/** Insere `[texto](url)`; o texto selecionado vira o rótulo e a URL fica selecionada. */
function insertTemplate(
  state: EditorState,
  open: string,
  close: string,
  placeholder: string,
  selectInClose: string,
): EditorState {
  const { value, start, end } = state;
  const label = value.slice(start, end) || placeholder;
  const inserted = open + label + close;
  const selectionStart = start + open.length + label.length + close.indexOf(selectInClose);

  return {
    value: value.slice(0, start) + inserted + value.slice(end),
    start: selectionStart,
    end: selectionStart + selectInClose.length,
  };
}

/** Bloco de código em linhas próprias (cercas ```), com o conteúdo selecionado. */
function insertCodeBlock(state: EditorState): EditorState {
  const { value, start, end } = state;
  const code = value.slice(start, end) || 'código';
  const needsBreakBefore = start > 0 && value[start - 1] !== '\n';
  const opening = `${needsBreakBefore ? '\n' : ''}\`\`\`\n`;
  const block = `${opening}${code}\n\`\`\`\n`;

  return {
    value: value.slice(0, start) + block + value.slice(end),
    start: start + opening.length,
    end: start + opening.length + code.length,
  };
}

/** Atalhos de teclado do editor (Ctrl/Cmd + tecla). */
export const SHORTCUTS: Record<string, MarkdownAction> = {
  b: 'bold',
  i: 'italic',
  k: 'link',
};
