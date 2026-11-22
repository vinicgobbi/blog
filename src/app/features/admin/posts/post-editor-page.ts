import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
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
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeoService } from '../../../core/seo/seo.service';
import { AdminPost, AdminPostInput, Media, PostStatus } from '../../../shared/models/admin';
import { ToastOutlet } from '../../../shared/components/toast/toast-outlet';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { AdminApi } from '../admin-api';
import { fromDateTimeLocal, toDateTimeLocal } from '../editor/datetime-local';
import { DateTimePicker } from '../editor/datetime-picker';
import { MarkdownEditor } from '../editor/markdown-editor';
import { MediaLibrary } from '../media/media-library';
import { STATE_LABELS } from './post-list-page';

/** Valores do formulário (tudo como texto, como nos inputs). */
export interface PostFormModel {
  title: string;
  slug: string;
  excerpt: string;
  body_markdown: string;
  category_id: string;
  tags: string;
  cover_image_path: string;
  published_at: string;
}

const EMPTY_POST: PostFormModel = {
  title: '',
  slug: '',
  excerpt: '',
  body_markdown: '',
  category_id: '',
  tags: '',
  cover_image_path: '',
  published_at: '',
};

/** Campos que a API pode apontar com erro de validação (422). */
const SERVER_FIELDS = Object.keys(EMPTY_POST) as (keyof PostFormModel)[];

export function toFormModel(post: AdminPost): PostFormModel {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? '',
    body_markdown: post.body_markdown ?? '',
    category_id: post.category ? String(post.category.id) : '',
    tags: post.tags.map((tag) => tag.name).join(', '),
    cover_image_path: post.cover_image_path ?? '',
    published_at: toDateTimeLocal(post.published_at),
  };
}

export function toPostInput(model: PostFormModel, status: PostStatus): AdminPostInput {
  const text = (value: string) => value.trim() || null;

  return {
    title: model.title.trim(),
    slug: text(model.slug),
    excerpt: text(model.excerpt),
    body_markdown: model.body_markdown,
    category_id: model.category_id ? Number(model.category_id) : null,
    cover_image_path: text(model.cover_image_path),
    status,
    published_at: fromDateTimeLocal(model.published_at),
    tags: model.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}

/**
 * Criação e edição de posts (`/admin/posts/novo` e `/admin/posts/:id`).
 */
@Component({
  selector: 'app-post-editor-page',
  imports: [DateTimePicker, FormField, MarkdownEditor, MediaLibrary, RouterLink, ToastOutlet],
  templateUrl: './post-editor-page.html',
  styleUrl: './post-editor-page.scss',
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class PostEditorPage {
  /** Parâmetro `:id` da rota; ausente em /admin/posts/novo. */
  readonly id = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown) => (value ? Number(value) : undefined),
  });

  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly post = this.api.post(() => this.id());
  protected readonly categories = this.api.categories();
  protected readonly saved = computed(() => (this.post.hasValue() ? this.post.value() : undefined));
  protected readonly stateLabels = STATE_LABELS;

  /** URL da capa para a miniatura (o formulário guarda só o caminho). */
  protected readonly coverUrl = signal<string | null>(null);
  /** A biblioteca só é renderizada (e só busca as imagens) com o diálogo aberto. */
  protected readonly coverPickerOpen = signal(false);
  private readonly coverDialog = viewChild<ElementRef<HTMLDialogElement>>('coverDialog');
  private readonly injector = inject(Injector);

  protected readonly model = signal<PostFormModel>({ ...EMPTY_POST });
  protected readonly postForm = form(this.model, (path) => {
    required(path.title, { message: 'Informe o título.' });
    maxLength(path.title, 255, { message: 'O título pode ter no máximo 255 caracteres.' });
    maxLength(path.slug, 255, { message: 'O slug pode ter no máximo 255 caracteres.' });
    maxLength(path.excerpt, 500, { message: 'O resumo pode ter no máximo 500 caracteres.' });
    required(path.body_markdown, { message: 'Escreva o conteúdo do post.' });
  });

  /** Uma data futura agenda o post em vez de publicá-lo agora. */
  protected readonly isFutureDate = computed(() => {
    const date = fromDateTimeLocal(this.model().published_at);

    return date !== null && new Date(date).getTime() > Date.now();
  });

  constructor() {
    const seo = inject(SeoService);

    // Ao carregar um post existente, o formulário recebe os dados e volta a "não modificado".
    effect(() => {
      const post = this.saved();

      if (post) {
        untracked(() => this.fill(post));
      }
    });

    effect(() => {
      seo.update({ title: this.id() ? 'Editar post' : 'Novo post', noindex: true });
    });
  }

  hasUnsavedChanges(): boolean {
    return this.postForm().dirty();
  }

  protected async save(event: Event, status: PostStatus): Promise<void> {
    event.preventDefault();
    await submit(this.postForm, (field) => this.persist(field, status));
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }

  private async persist(
    field: FieldTree<PostFormModel>,
    status: PostStatus,
  ): Promise<TreeValidationResult> {
    let saved: AdminPost;

    try {
      saved = (
        await firstValueFrom(
          this.api.savePost(this.id() ?? null, toPostInput(this.model(), status)),
        )
      ).data;
    } catch (error) {
      return this.handleError(error, field);
    }

    this.fill(saved);
    this.toast.success(this.successMessage(saved));

    if (!this.id()) {
      await this.router.navigate(['/admin/posts', saved.id], {
        replaceUrl: true,
      });
    }

    return undefined;
  }

  protected openCoverPicker(): void {
    this.coverPickerOpen.set(true);
    afterNextRender(() => this.coverDialog()?.nativeElement.showModal(), {
      injector: this.injector,
    });
  }

  protected closeCoverPicker(): void {
    this.coverDialog()?.nativeElement.close();
    this.coverPickerOpen.set(false);
  }

  protected setCover(media: Media): void {
    this.postForm.cover_image_path().value.set(media.path);
    this.postForm.cover_image_path().markAsDirty();
    this.coverUrl.set(media.url);
    this.closeCoverPicker();
  }

  protected removeCover(): void {
    this.postForm.cover_image_path().value.set('');
    this.postForm.cover_image_path().markAsDirty();
    this.coverUrl.set(null);
  }

  private fill(post: AdminPost): void {
    this.model.set(toFormModel(post));
    this.coverUrl.set(post.cover_image_url);
    this.postForm().reset();
  }

  private successMessage(post: AdminPost): string {
    return {
      draft: 'Rascunho salvo.',
      scheduled: 'Post agendado.',
      published: 'Post publicado.',
    }[post.state];
  }

  private handleError(error: unknown, field: FieldTree<PostFormModel>): TreeValidationResult {
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const errors = (error.error?.errors ?? {}) as Partial<Record<string, string[]>>;
      const fieldErrors = SERVER_FIELDS.filter((name) => errors[name]?.length).map((name) => ({
        kind: 'server',
        message: errors[name]![0],
        fieldTree: field[name],
      }));
      const tagErrors = Object.keys(errors).filter((name) => name.startsWith('tags.'));
      if (tagErrors.length) {
        fieldErrors.push({
          kind: 'server',
          message: errors[tagErrors[0]]![0],
          fieldTree: field.tags,
        });
      }

      this.toast.warning('Corrija os campos destacados.');

      return fieldErrors;
    }

    this.toast.error('Não foi possível salvar o post. Tente novamente.');

    return undefined;
  }
}
