/**
 * Conversões entre o valor do <input type="datetime-local"> (horário local,
 * sem fuso, ex.: "2026-11-21T09:30") e as datas ISO 8601 da API.
 */

/** Data ISO da API → valor do input, no fuso do navegador. Vazio quando não há data. */
export function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) {
    return '';
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (value: number) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Valor do input → ISO 8601 em UTC (a API converte para o fuso dela). Null quando vazio. */
export function fromDateTimeLocal(value: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
