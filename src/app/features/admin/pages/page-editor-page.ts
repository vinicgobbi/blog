import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import {
  FieldTree,
  FormField,
  TreeValidationResult,
  form,
  maxLength,
  required,
  submit,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeoService } from '../../../core/seo/seo.service';
import { AdminPage, AdminPageInput } from '../../../shared/models/admin';
import { AdminApi } from '../admin-api';
import { IconPicker } from '../editor/icon-picker';
import { MarkdownEditor } from '../editor/markdown-editor';

export interface PageFormModel {
  title: string;
  slug: string;
  icon: string;
  body_markdown: string;
  is_published: boolean;
}

interface Feedback {
  kind: 'success' | 'error';
  message: string;
}

const EMPTY_PAGE: PageFormModel = {
  title: '',
  slug: '',
  icon: '',
  body_markdown: '',
  is_published: false,
};

/** Campos que a API pode apontar com erro de validação (422). */
const SERVER_FIELDS = Object.keys(EMPTY_PAGE) as (keyof PageFormModel)[];

export function toPageFormModel(page: AdminPage): PageFormModel {
  return {
    title: page.title,
    slug: page.slug,
    icon: page.icon,
    body_markdown: page.body_markdown ?? '',
    is_published: page.is_published,
  };
}

export function toPageInput(model: PageFormModel): AdminPageInput {
  return {
    title: model.title.trim(),
    slug: model.slug.trim() || null,
    icon: model.icon,
    body_markdown: model.body_markdown,
    is_published: model.is_published,
  };
}

/**
 * Criação e edição de páginas estáticas (`/admin/paginas/nova` e `/admin/paginas/:id`).
 * Usa o mesmo layout do editor de posts.
 */
@Component({
  selector: 'app-page-editor-page',
  imports: [FormField, IconPicker, MarkdownEditor, RouterLink],
  templateUrl: './page-editor-page.html',
  styleUrls: ['../posts/post-editor-page.scss', './page-editor-page.scss'],
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class PageEditorPage {
  /** Parâmetro `:id` da rota; ausente em /admin/paginas/nova. */
  readonly id = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown) => (value ? Number(value) : undefined),
  });

  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);

  protected readonly page = this.api.page(() => this.id());
  protected readonly saved = computed(() => (this.page.hasValue() ? this.page.value() : undefined));

  protected readonly model = signal<PageFormModel>({ ...EMPTY_PAGE });
  protected readonly pageForm = form(this.model, (path) => {
    required(path.title, { message: 'Informe o título.' });
    maxLength(path.title, 255, { message: 'O título pode ter no máximo 255 caracteres.' });
    maxLength(path.slug, 255, { message: 'O slug pode ter no máximo 255 caracteres.' });
    required(path.icon, { message: 'Escolha um ícone para o menu do blog.' });
    required(path.body_markdown, { message: 'Escreva o conteúdo da página.' });
  });

  /** Mensagem vinda da navegação após criar uma página (o componente é recriado na nova URL). */
  protected readonly feedback = signal<Feedback | null>(
    (this.router.currentNavigation()?.extras.state?.['feedback'] as Feedback | undefined) ?? null,
  );

  constructor() {
    const seo = inject(SeoService);

    // Ao carregar uma página existente, o formulário recebe os dados e volta a "não modificado".
    effect(() => {
      const page = this.saved();

      if (page) {
        untracked(() => this.fill(page));
      }
    });

    effect(() => {
      seo.update({ title: this.id() ? 'Editar página' : 'Nova página', noindex: true });
    });
  }

  hasUnsavedChanges(): boolean {
    return this.pageForm().dirty();
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.feedback.set(null);

    await submit(this.pageForm, (field) => this.persist(field));
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }

  private async persist(field: FieldTree<PageFormModel>): Promise<TreeValidationResult> {
    let saved: AdminPage;

    try {
      saved = (
        await firstValueFrom(this.api.savePage(this.id() ?? null, toPageInput(this.model())))
      ).data;
    } catch (error) {
      return this.handleError(error, field);
    }

    const feedback: Feedback = {
      kind: 'success',
      message: saved.is_published ? 'Página publicada.' : 'Rascunho salvo.',
    };
    this.fill(saved);
    this.feedback.set(feedback);

    if (!this.id()) {
      await this.router.navigate(['/admin/paginas', saved.id], {
        replaceUrl: true,
        state: { feedback },
      });
    }

    return undefined;
  }

  private fill(page: AdminPage): void {
    this.model.set(toPageFormModel(page));
    this.pageForm().reset();
  }

  private handleError(error: unknown, field: FieldTree<PageFormModel>): TreeValidationResult {
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const errors = (error.error?.errors ?? {}) as Partial<Record<string, string[]>>;
      this.feedback.set({ kind: 'error', message: 'Corrija os campos destacados.' });

      return SERVER_FIELDS.filter((name) => errors[name]?.length).map((name) => ({
        kind: 'server',
        message: errors[name]![0],
        fieldTree: field[name],
      }));
    }

    this.feedback.set({
      kind: 'error',
      message: 'Não foi possível salvar a página. Tente novamente.',
    });

    return undefined;
  }
}
