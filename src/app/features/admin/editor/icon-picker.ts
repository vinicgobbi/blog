import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  model,
  output,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { MAX_ICON_RESULTS, filterIcons, loadIconNames } from './icon-names';

let nextId = 1;

/**
 * Seletor de ícone do Bootstrap Icons, com busca. O valor é o nome do ícone
 * sem o prefixo "bi-" (ex.: "person"). Funciona como controle do Signal Forms:
 * `<app-icon-picker [formField]="form.icon" />`.
 */
@Component({
  selector: 'app-icon-picker',
  templateUrl: './icon-picker.html',
  styleUrl: './icon-picker.scss',
  host: {
    class: 'icon-picker',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close(true)',
  },
})
export class IconPicker implements FormValueControl<string> {
  readonly value = model('');
  readonly invalid = input(false);
  /** Como nos demais campos, o erro só é destacado depois que o campo foi tocado. */
  readonly touched = input(false);
  readonly disabled = input(false);
  readonly touch = output<void>();
  /** Id do botão, para o <label for> e mensagens de erro. */
  readonly inputId = input('icon-picker');
  readonly describedBy = input<string | null>(null);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly toggleButton = viewChild.required<ElementRef<HTMLButtonElement>>('toggleButton');
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('search');

  protected readonly panelId = `icon-picker-panel-${nextId++}`;
  protected readonly open = signal(false);
  protected readonly query = signal('');

  /** A lista completa só é carregada na primeira vez que o painel abre. */
  protected readonly names = resource({
    params: () => (this.open() ? true : undefined),
    loader: () => loadIconNames(),
  });
  protected readonly searching = computed(() => this.query().trim() !== '');
  protected readonly results = computed(() =>
    filterIcons(this.names.hasValue() ? this.names.value() : [], this.query()),
  );
  protected readonly truncated = computed(() => this.results().length === MAX_ICON_RESULTS);

  protected toggle(): void {
    if (this.open()) {
      this.close(false);

      return;
    }

    this.query.set('');
    this.open.set(true);
    afterNextRender(() => this.searchInput()?.nativeElement.focus(), { injector: this.injector });
  }

  protected select(name: string): void {
    this.value.set(name);
    this.close(true);
  }

  /** Fecha o painel e marca o campo como tocado; `restoreFocus` volta o foco ao botão. */
  protected close(restoreFocus: boolean): void {
    if (!this.open()) {
      return;
    }

    this.open.set(false);
    this.touch.emit();

    if (restoreFocus) {
      this.toggleButton().nativeElement.focus();
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close(false);
    }
  }
}
