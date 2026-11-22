import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  Injector,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import {
  DEFAULT_HOUR,
  DateTimeParts,
  IsoDay,
  WEEKDAYS,
  addDays,
  addMonths,
  dayLabel,
  displayDateTime,
  edgeOfWeek,
  formatDateTime,
  monthGrid,
  monthTitle,
  parseDateTime,
  relativeToNow,
  toIsoDay,
} from './calendar';

/** Em telas de toque o seletor nativo do sistema é bom o bastante (roletas, calendário). */
export const NATIVE_PICKER_QUERY = '(pointer: coarse)';

type TimePart = 'hour' | 'minute';

let nextId = 1;

/**
 * Seletor de data e hora no visual do site, com calendário, hora e atalhos. O
 * valor tem o formato do <input type="datetime-local"> ("2026-11-21T09:30", no
 * fuso do navegador) e vazio quando não há data. Em telas de toque usa o
 * seletor nativo. Funciona como controle do Signal Forms:
 * `<app-datetime-picker [formField]="form.published_at" />`.
 *
 * Teclado no calendário (padrão de date picker do WAI-ARIA): setas mudam o dia,
 * Home/End vão ao início/fim da semana, PageUp/PageDown mudam o mês, Enter ou
 * espaço escolhem e Esc fecha.
 */
@Component({
  selector: 'app-datetime-picker',
  templateUrl: './datetime-picker.html',
  styleUrl: './datetime-picker.scss',
  host: {
    class: 'datetime-picker',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close(true)',
  },
})
export class DateTimePicker implements FormValueControl<string> {
  readonly value = model('');
  readonly invalid = input(false);
  /** Como nos demais campos, o erro só é destacado depois que o campo foi tocado. */
  readonly touched = input(false);
  readonly disabled = input(false);
  readonly touch = output<void>();
  /** Id do campo, para o <label for> e mensagens de erro. */
  readonly inputId = input('datetime-picker');
  readonly describedBy = input<string | null>(null);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly toggleButton = viewChild<ElementRef<HTMLButtonElement>>('toggleButton');

  protected readonly weekdays = WEEKDAYS;
  protected readonly panelId = `datetime-picker-panel-${nextId++}`;
  protected readonly titleId = `${this.panelId}-titulo`;
  protected readonly native = signal(isNativePickerPreferred(inject(PLATFORM_ID)));
  protected readonly open = signal(false);
  private readonly now = signal(new Date());

  protected readonly parts = computed(() => parseDateTime(this.value()));
  protected readonly today = computed(() => toIsoDay(this.now()));
  /** Dia com o foco do teclado; também define o mês exibido. */
  protected readonly focusedDay = signal<IsoDay>(toIsoDay(new Date()));
  protected readonly weeks = computed(() => monthGrid(this.focusedDay()));
  protected readonly monthTitle = computed(() => monthTitle(this.focusedDay()));

  protected readonly display = computed(() => {
    const parts = this.parts();

    return parts ? displayDateTime(parts) : null;
  });
  protected readonly relative = computed(() => {
    const parts = this.parts();

    return parts ? relativeToNow(parts, this.now()) : null;
  });
  protected readonly hour = computed(() => pad(this.parts()?.hour ?? DEFAULT_HOUR));
  protected readonly minute = computed(() => pad(this.parts()?.minute ?? 0));

  protected readonly dayLabel = dayLabel;

  protected toggle(): void {
    if (this.open()) {
      this.close(false);

      return;
    }

    this.now.set(new Date());
    this.focusedDay.set(this.parts()?.day ?? this.today());
    this.open.set(true);
    this.focusDay();
  }

  /** Fecha o painel e marca o campo como tocado; `restoreFocus` volta o foco ao campo. */
  protected close(restoreFocus: boolean): void {
    if (!this.open()) {
      return;
    }

    this.open.set(false);
    this.touch.emit();

    if (restoreFocus) {
      this.toggleButton()?.nativeElement.focus();
    }
  }

  protected selectDay(day: IsoDay): void {
    const parts = this.parts();
    this.focusedDay.set(day);
    this.update({ day, hour: parts?.hour ?? DEFAULT_HOUR, minute: parts?.minute ?? 0 });
  }

  protected changeMonth(amount: number): void {
    this.focusedDay.update((day) => addMonths(day, amount));
  }

  protected onDayKeydown(event: KeyboardEvent, day: IsoDay): void {
    const moves: Record<string, () => IsoDay> = {
      ArrowLeft: () => addDays(day, -1),
      ArrowRight: () => addDays(day, 1),
      ArrowUp: () => addDays(day, -7),
      ArrowDown: () => addDays(day, 7),
      Home: () => edgeOfWeek(day, 'start'),
      End: () => edgeOfWeek(day, 'end'),
      PageUp: () => addMonths(day, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(day, event.shiftKey ? 12 : 1),
    };
    const move = moves[event.key];

    if (!move) {
      return;
    }

    event.preventDefault();
    this.focusedDay.set(move());
    this.focusDay();
  }

  /** Digitação na hora ou nos minutos: aplica ao sair do campo ou com Enter. */
  protected setTime(part: TimePart, event: Event): void {
    const input = event.target as HTMLInputElement;
    const number = Number.parseInt(input.value, 10);
    const max = part === 'hour' ? 23 : 59;
    const current = Number(part === 'hour' ? this.hour() : this.minute());
    const value = Number.isNaN(number) ? current : Math.min(Math.max(number, 0), max);

    input.value = pad(value);
    this.updateTime(part, value);
  }

  /** Setas para cima e para baixo mudam a hora ou os minutos, voltando ao início no limite. */
  protected stepTime(part: TimePart, event: KeyboardEvent): void {
    const step = { ArrowUp: 1, ArrowDown: -1 }[event.key as 'ArrowUp' | 'ArrowDown'];

    if (!step) {
      return;
    }

    event.preventDefault();
    const size = part === 'hour' ? 24 : 60;
    const current = Number(part === 'hour' ? this.hour() : this.minute());
    this.updateTime(part, (current + step + size) % size);
  }

  protected setNow(): void {
    const now = new Date();
    this.now.set(now);
    this.focusedDay.set(toIsoDay(now));
    this.update({ day: toIsoDay(now), hour: now.getHours(), minute: now.getMinutes() });
  }

  protected setTomorrowMorning(): void {
    const day = addDays(toIsoDay(new Date()), 1);
    this.focusedDay.set(day);
    this.update({ day, hour: DEFAULT_HOUR, minute: 0 });
  }

  protected clear(): void {
    this.value.set('');
    this.close(true);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close(false);
    }
  }

  protected onNativeInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  private updateTime(part: TimePart, value: number): void {
    const parts = this.parts();
    const base = parts ?? { day: this.focusedDay(), hour: DEFAULT_HOUR, minute: 0 };
    this.update({ ...base, [part]: value });
  }

  private update(parts: DateTimeParts): void {
    this.value.set(formatDateTime(parts));
  }

  private focusDay(): void {
    afterNextRender(
      () => {
        const button = this.host.nativeElement.querySelector<HTMLButtonElement>(
          `[data-day="${this.focusedDay()}"]`,
        );
        button?.focus();
      },
      { injector: this.injector },
    );
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function isNativePickerPreferred(platformId: object): boolean {
  return (
    isPlatformBrowser(platformId) &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(NATIVE_PICKER_QUERY).matches
  );
}
