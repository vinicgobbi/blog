/**
 * Funções de calendário do seletor de data e hora (DateTimePicker). Trabalham
 * com o mesmo formato do <input type="datetime-local">: "2026-11-21T09:30",
 * no fuso do navegador (ver datetime-local.ts para a conversão com a API).
 */

/** Dia do calendário, sem hora: "2026-11-21". */
export type IsoDay = string;

export interface CalendarDay {
  day: IsoDay;
  /** Número do dia no mês (1–31). */
  label: number;
  /** Pertence ao mês exibido (os demais completam a primeira e a última semana). */
  inMonth: boolean;
}

export interface DateTimeParts {
  day: IsoDay;
  hour: number;
  minute: number;
}

/** Horário usado ao escolher um dia quando ainda não há hora definida. */
export const DEFAULT_HOUR = 9;

const pad = (value: number) => String(value).padStart(2, '0');

/** Date local (meio-dia, longe de mudanças de horário de verão) → "2026-11-21". */
export function toIsoDay(date: Date): IsoDay {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromIsoDay(day: IsoDay): Date {
  const [year, month, date] = day.split('-').map(Number);

  return new Date(year, month - 1, date, 12);
}

/** "2026-11-21T09:30" → partes; null para vazio ou inválido. */
export function parseDateTime(value: string): DateTimeParts | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value);

  if (!match) {
    return null;
  }

  const [, day, hour, minute] = match;

  return Number.isNaN(fromIsoDay(day).getTime())
    ? null
    : { day, hour: Number(hour), minute: Number(minute) };
}

export function formatDateTime({ day, hour, minute }: DateTimeParts): string {
  return `${day}T${pad(hour)}:${pad(minute)}`;
}

export function addDays(day: IsoDay, amount: number): IsoDay {
  const date = fromIsoDay(day);
  date.setDate(date.getDate() + amount);

  return toIsoDay(date);
}

/** Soma meses mantendo o dia, limitado ao último dia do mês (31/01 + 1 mês → 28/02). */
export function addMonths(day: IsoDay, amount: number): IsoDay {
  const date = fromIsoDay(day);
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0, 12).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));

  return toIsoDay(target);
}

/** Primeiro (0) ou último (6) dia da semana do dia informado; a semana começa no domingo. */
export function edgeOfWeek(day: IsoDay, edge: 'start' | 'end'): IsoDay {
  const weekday = fromIsoDay(day).getDay();

  return addDays(day, edge === 'start' ? -weekday : 6 - weekday);
}

/** Semanas (domingo a sábado) que cobrem o mês do dia informado. */
export function monthGrid(day: IsoDay): CalendarDay[][] {
  const date = fromIsoDay(day);
  const first = toIsoDay(new Date(date.getFullYear(), date.getMonth(), 1, 12));
  const last = toIsoDay(new Date(date.getFullYear(), date.getMonth() + 1, 0, 12));
  const weeks: CalendarDay[][] = [];

  for (let start = edgeOfWeek(first, 'start'); start <= last; start = addDays(start, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, index) => {
        const current = addDays(start, index);

        return {
          day: current,
          label: fromIsoDay(current).getDate(),
          inMonth: current.slice(0, 7) === first.slice(0, 7),
        };
      }),
    );
  }

  return weeks;
}

/** Cabeçalho do calendário: "novembro de 2026". */
export function monthTitle(day: IsoDay): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    fromIsoDay(day),
  );
}

/** Nome completo do dia, para leitores de tela: "sábado, 21 de novembro de 2026". */
export function dayLabel(day: IsoDay): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(fromIsoDay(day));
}

/** Valor exibido no campo, no formato dd/mm/aaaa: "21/11/2026 · 09:30". */
export function displayDateTime(parts: DateTimeParts): string {
  const [year, month, day] = parts.day.split('-');

  return `${day}/${month}/${year} · ${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** Distância até agora, em português (Intl): "em 3 dias", "há 2 horas", "agora". */
export function relativeToNow(parts: DateTimeParts, now: Date): string {
  const [year, month, date] = parts.day.split('-').map(Number);
  const target = new Date(year, month - 1, date, parts.hour, parts.minute);
  const minutes = Math.round((target.getTime() - now.getTime()) / 60_000);
  const format = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

  if (Math.abs(minutes) < 1) {
    return 'agora';
  }
  if (Math.abs(minutes) < 60) {
    return format.format(minutes, 'minute');
  }
  if (Math.abs(minutes) < 60 * 24) {
    return format.format(Math.round(minutes / 60), 'hour');
  }

  return format.format(Math.round(minutes / (60 * 24)), 'day');
}

/** Iniciais dos dias da semana, a partir do domingo, com o nome completo para leitores de tela. */
export const WEEKDAYS = [
  { short: 'D', long: 'domingo' },
  { short: 'S', long: 'segunda-feira' },
  { short: 'T', long: 'terça-feira' },
  { short: 'Q', long: 'quarta-feira' },
  { short: 'Q', long: 'quinta-feira' },
  { short: 'S', long: 'sexta-feira' },
  { short: 'S', long: 'sábado' },
];
