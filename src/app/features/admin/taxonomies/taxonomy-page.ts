import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  FieldTree,
  FormField,
  TreeValidationResult,
  form,
  maxLength,
  required,
  submit,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { SeoService } from '../../../core/seo/seo.service';
import { TaxonomyInput } from '../../../shared/models/admin';
import { Category, Tag } from '../../../shared/models/blog';
import { AdminApi, TaxonomyKind } from '../admin-api';

export interface TaxonomyFormModel {
  name: string;
  slug: string;
  description: string;
}

interface Feedback {
  kind: 'success' | 'error';
  message: string;
}

interface TaxonomyConfig {
  title: string;
  /** Nome no singular, com artigo, para mensagens: "a categoria". */
  singular: string;
  path: string;
  /** Prefixo da página pública, para o link "ver no blog". */
  publicPath: string;
  nameMaxLength: number;
  hasDescription: boolean;
  created: string;
  updated: string;
  /** Aviso exibido na confirmação de exclusão, conforme o número de posts. */
  deleteWarning: (postsCount: number) => string;
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

export const TAXONOMY_CONFIG: Record<TaxonomyKind, TaxonomyConfig> = {
  categories: {
    title: 'Categorias',
    singular: 'a categoria',
    path: '/admin/categorias',
    publicPath: '/categorias/',
    nameMaxLength: 100,
    hasDescription: true,
    created: 'Categoria criada.',
    updated: 'Categoria atualizada.',
    deleteWarning: (count) =>
      count
        ? `${count} ${plural(count, 'post ficará', 'posts ficarão')} sem categoria.`
        : 'Nenhum post usa esta categoria.',
  },
  tags: {
    title: 'Tags',
    singular: 'a tag',
    path: '/admin/tags',
    publicPath: '/tags/',
    nameMaxLength: 50,
    hasDescription: false,
    created: 'Tag criada.',
    updated: 'Tag atualizada.',
    deleteWarning: (count) =>
      count
        ? `Ela será removida de ${count} ${plural(count, 'post', 'posts')}.`
        : 'Nenhum post usa esta tag.',
  },
};

const EMPTY: TaxonomyFormModel = { name: '', slug: '', description: '' };

const SERVER_FIELDS = Object.keys(EMPTY) as (keyof TaxonomyFormModel)[];

export function toTaxonomyInput(model: TaxonomyFormModel, kind: TaxonomyKind): TaxonomyInput {
  const input: TaxonomyInput = { name: model.name.trim(), slug: model.slug.trim() || null };

  if (TAXONOMY_CONFIG[kind].hasDescription) {
    input.description = model.description.trim() || null;
  }

  return input;
}

/**
 * Gestão de categorias (`/admin/categorias`) e tags (`/admin/tags`): a lista
 * e, ao lado, o formulário que cria um item novo ou edita o selecionado.
 */
@Component({
  selector: 'app-taxonomy-page',
  imports: [FormField],
  templateUrl: './taxonomy-page.html',
  styleUrls: ['../admin-list.scss', './taxonomy-page.scss'],
})
export class TaxonomyPage {
  /** Vem do `data` da rota. */
  readonly kind = input.required<TaxonomyKind>();

  private readonly api = inject(AdminApi);

  protected readonly config = computed(() => TAXONOMY_CONFIG[this.kind()]);
  protected readonly items = this.api.taxonomies(() => this.kind());
  protected readonly list = computed(() => (this.items.hasValue() ? this.items.value() : []));

  /** Item em edição; nulo quando o formulário cria um novo. */
  protected readonly editing = signal<Category | Tag | null>(null);
  protected readonly feedback = signal<Feedback | null>(null);
  protected readonly deleteError = signal<string | null>(null);
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  protected readonly model = signal<TaxonomyFormModel>({ ...EMPTY });
  protected readonly taxonomyForm = form(this.model, (path) => {
    required(path.name, { message: 'Informe o nome.' });
    maxLength(path.name, () => this.config().nameMaxLength, {
      message: () => `O nome pode ter no máximo ${this.config().nameMaxLength} caracteres.`,
    });
    maxLength(path.slug, 255, { message: 'O slug pode ter no máximo 255 caracteres.' });
    maxLength(path.description, 500, { message: 'A descrição pode ter no máximo 500 caracteres.' });
  });

  constructor() {
    const seo = inject(SeoService);

    effect(() => {
      const config = this.config();
      seo.update({ title: config.title, path: config.path, noindex: true });
    });
  }

  protected edit(item: Category | Tag): void {
    this.editing.set(item);
    this.feedback.set(null);
    this.model.set({
      name: item.name,
      slug: item.slug,
      description: 'description' in item ? (item.description ?? '') : '',
    });
    this.taxonomyForm().reset();
    this.nameInput()?.nativeElement.focus();
  }

  protected cancelEdit(): void {
    this.clearForm();
    this.feedback.set(null);
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.feedback.set(null);

    await submit(this.taxonomyForm, (field) => this.persist(field));
  }

  protected async remove(item: Category | Tag): Promise<void> {
    const warning = this.config().deleteWarning(item.posts_count ?? 0);

    if (!confirm(`Excluir ${this.config().singular} "${item.name}"? ${warning}`)) {
      return;
    }

    this.deleteError.set(null);

    try {
      await firstValueFrom(this.api.deleteTaxonomy(this.kind(), item.id));
      if (this.editing()?.id === item.id) {
        this.clearForm();
      }
      this.items.reload();
    } catch {
      this.deleteError.set(`Não foi possível excluir "${item.name}". Tente novamente.`);
    }
  }

  private async persist(field: FieldTree<TaxonomyFormModel>): Promise<TreeValidationResult> {
    const editing = this.editing();

    try {
      await firstValueFrom(
        this.api.saveTaxonomy(
          this.kind(),
          editing?.id ?? null,
          toTaxonomyInput(this.model(), this.kind()),
        ),
      );
    } catch (error) {
      return this.handleError(error, field);
    }

    this.clearForm();
    this.feedback.set({
      kind: 'success',
      message: editing ? this.config().updated : this.config().created,
    });
    this.items.reload();

    return undefined;
  }

  private clearForm(): void {
    this.editing.set(null);
    this.model.set({ ...EMPTY });
    this.taxonomyForm().reset();
  }

  private handleError(error: unknown, field: FieldTree<TaxonomyFormModel>): TreeValidationResult {
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const errors = (error.error?.errors ?? {}) as Partial<Record<string, string[]>>;
      this.feedback.set({ kind: 'error', message: 'Corrija os campos destacados.' });

      return SERVER_FIELDS.filter((name) => errors[name]?.length).map((name) => ({
        kind: 'server',
        message: errors[name]![0],
        fieldTree: field[name],
      }));
    }

    this.feedback.set({ kind: 'error', message: 'Não foi possível salvar. Tente novamente.' });

    return undefined;
  }
}
