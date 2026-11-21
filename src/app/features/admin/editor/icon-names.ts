/**
 * Nomes dos ícones do Bootstrap Icons (a mesma fonte usada no site), sem o
 * prefixo "bi-". A lista (~2 mil nomes) é importada sob demanda, num chunk
 * separado, só quando o seletor de ícones é aberto no admin.
 */
let iconNames: Promise<string[]> | undefined;

export function loadIconNames(): Promise<string[]> {
  iconNames ??= import('bootstrap-icons/font/bootstrap-icons.json').then((module) =>
    Object.keys(module.default),
  );

  return iconNames;
}

/** Ícones mostrados antes de qualquer busca: os mais comuns para páginas de um blog. */
export const SUGGESTED_ICONS = [
  'person',
  'person-circle',
  'info-circle',
  'envelope',
  'chat-dots',
  'briefcase',
  'code-slash',
  'terminal',
  'book',
  'journal-text',
  'mortarboard',
  'lightbulb',
  'rocket-takeoff',
  'trophy',
  'star',
  'heart',
  'camera',
  'music-note',
  'controller',
  'cup-hot',
  'globe2',
  'map',
  'geo-alt',
  'calendar-event',
  'link-45deg',
  'newspaper',
  'file-earmark-text',
  'question-circle',
  'shield-check',
  'tools',
];

/** Quantos resultados da busca são exibidos de uma vez. */
export const MAX_ICON_RESULTS = 120;

/**
 * Filtra os nomes por todos os termos da busca (ex.: "arrow left" acha
 * "arrow-left-circle"). Sem busca, retorna as sugestões.
 */
export function filterIcons(names: readonly string[], query: string): string[] {
  const terms = query
    .toLowerCase()
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean);

  if (!terms.length) {
    return SUGGESTED_ICONS;
  }

  const matches: string[] = [];

  for (const name of names) {
    if (terms.every((term) => name.includes(term))) {
      matches.push(name);

      if (matches.length === MAX_ICON_RESULTS) {
        break;
      }
    }
  }

  return matches;
}
