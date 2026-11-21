import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  debounced,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { prepareArticleHtml } from '../../blog/post/article-html';
import { AdminApi } from '../admin-api';
import { MarkdownAction, SHORTCUTS, applyMarkdown } from './markdown-actions';

interface ToolbarButton {
  action: MarkdownAction;
  icon: string;
  label: string;
  shortcut?: string;
}

/** Espera entre a última tecla e a atualização da pré-visualização. */
export const PREVIEW_DEBOUNCE_MS = 400;

/**
 * Editor de Markdown com toolbar e pré-visualização gerada pela API (mesmo
 * HTML do post publicado). Funciona como controle do Signal Forms:
 * `<app-markdown-editor [formField]="form.body_markdown" />`.
 */
@Component({
  selector: 'app-markdown-editor',
  templateUrl: './markdown-editor.html',
  styleUrl: './markdown-editor.scss',
})
export class MarkdownEditor implements FormValueControl<string> {
  readonly value = model('');
  readonly invalid = input(false);
  readonly disabled = input(false);
  readonly touch = output<void>();
  /** Id do textarea, para o <label for> e mensagens de erro. */
  readonly inputId = input('markdown-editor');
  readonly describedBy = input<string | null>(null);

  private readonly injector = inject(Injector);
  private readonly textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('textarea');

  /** Abas no celular; no desktop os dois painéis ficam lado a lado. */
  protected readonly mode = signal<'write' | 'preview'>('write');

  private readonly debouncedValue = debounced(() => this.value(), PREVIEW_DEBOUNCE_MS);
  protected readonly preview = inject(AdminApi).markdownPreview(() =>
    this.debouncedValue.hasValue() ? this.debouncedValue.value() : undefined,
  );
  protected readonly previewHtml = computed(() =>
    this.preview.hasValue() ? prepareArticleHtml(this.preview.value() ?? '') : '',
  );

  protected readonly buttons: ToolbarButton[] = [
    { action: 'heading', icon: 'bi-type-h2', label: 'Título' },
    { action: 'bold', icon: 'bi-type-bold', label: 'Negrito', shortcut: 'Ctrl+B' },
    { action: 'italic', icon: 'bi-type-italic', label: 'Itálico', shortcut: 'Ctrl+I' },
    { action: 'link', icon: 'bi-link-45deg', label: 'Link', shortcut: 'Ctrl+K' },
    { action: 'bulletList', icon: 'bi-list-ul', label: 'Lista' },
    { action: 'orderedList', icon: 'bi-list-ol', label: 'Lista numerada' },
    { action: 'quote', icon: 'bi-quote', label: 'Citação' },
    { action: 'code', icon: 'bi-code', label: 'Código' },
    { action: 'codeBlock', icon: 'bi-code-square', label: 'Bloco de código' },
    { action: 'image', icon: 'bi-image', label: 'Imagem' },
  ];

  protected apply(action: MarkdownAction): void {
    const element = this.textarea().nativeElement;
    const next = applyMarkdown(action, {
      value: this.value(),
      start: element.selectionStart,
      end: element.selectionEnd,
    });

    this.value.set(next.value);
    // A seleção é restaurada depois que o textarea recebe o novo valor.
    afterNextRender(
      () => {
        element.focus();
        element.setSelectionRange(next.start, next.end);
      },
      { injector: this.injector },
    );
  }

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLTextAreaElement).value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const action = SHORTCUTS[event.key.toLowerCase()];

    if (action && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
      event.preventDefault();
      this.apply(action);
    }
  }

  protected title(button: ToolbarButton): string {
    return button.shortcut ? `${button.label} (${button.shortcut})` : button.label;
  }
}
