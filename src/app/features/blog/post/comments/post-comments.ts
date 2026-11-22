import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import {
  FieldTree,
  FormField,
  TreeValidationResult,
  email,
  form,
  maxLength,
  minLength,
  required,
  submit,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { CommentInput } from '../../../../shared/models/blog';
import { BlogApi } from '../../blog-api';

const EMPTY_COMMENT: CommentInput = { author_name: '', author_email: '', body: '', website: '' };

/** Campos que a API pode apontar com erro de validação (422). */
const SERVER_FIELDS = ['author_name', 'author_email', 'body'] as const;

/**
 * Comentários aprovados de um post e formulário para enviar um novo.
 * Comentários enviados só aparecem depois de aprovados na moderação.
 */
@Component({
  selector: 'app-post-comments',
  imports: [DatePipe, FormField],
  templateUrl: './post-comments.html',
  styleUrl: './post-comments.scss',
})
export class PostComments {
  readonly slug = input.required<string>();

  private readonly api = inject(BlogApi);
  private readonly toast = inject(ToastService);

  protected readonly comments = this.api.comments(() => this.slug());
  protected readonly list = computed(() =>
    this.comments.hasValue() ? (this.comments.value()?.data ?? []) : [],
  );
  protected readonly total = computed(() =>
    this.comments.hasValue() ? (this.comments.value()?.meta.total ?? 0) : 0,
  );

  protected readonly model = signal<CommentInput>({ ...EMPTY_COMMENT });
  protected readonly commentForm = form(this.model, (path) => {
    required(path.author_name, { message: 'Informe seu nome.' });
    maxLength(path.author_name, 100, { message: 'O nome pode ter no máximo 100 caracteres.' });
    required(path.author_email, { message: 'Informe seu e-mail.' });
    email(path.author_email, { message: 'Informe um e-mail válido.' });
    required(path.body, { message: 'Escreva seu comentário.' });
    minLength(path.body, 2, { message: 'O comentário deve ter pelo menos 2 caracteres.' });
    maxLength(path.body, 5000, { message: 'O comentário pode ter no máximo 5000 caracteres.' });
  });

  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.commentForm, (field) => this.post(field));
  }

  protected initial(name: string): string {
    return name.trim().charAt(0).toUpperCase() || '?';
  }

  private async post(field: FieldTree<CommentInput>): Promise<TreeValidationResult> {
    try {
      await firstValueFrom(this.api.sendComment(this.slug(), this.model()));
    } catch (error) {
      return this.handleError(error, field);
    }

    this.toast.success('Comentário enviado! Ele será publicado após a moderação.');
    this.model.set({ ...EMPTY_COMMENT });
    this.commentForm().reset();

    return undefined;
  }

  /** Erros 422 aparecem no campo correspondente; os demais, como aviso geral. */
  private handleError(error: unknown, field: FieldTree<CommentInput>): TreeValidationResult {
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const errors = (error.error?.errors ?? {}) as Partial<Record<string, string[]>>;

      return SERVER_FIELDS.filter((name) => errors[name]?.length).map((name) => ({
        kind: 'server',
        message: errors[name]![0],
        fieldTree: field[name],
      }));
    }

    if (error instanceof HttpErrorResponse && error.status === 429) {
      this.toast.warning(
        'Você enviou muitos comentários seguidos. Aguarde um minuto e tente novamente.',
      );
    } else {
      this.toast.error('Não foi possível enviar o comentário. Tente novamente.');
    }

    return undefined;
  }
}
