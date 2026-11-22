import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Media } from '../../../shared/models/admin';
import { AdminApi } from '../admin-api';
import { ACCEPTED_IMAGE_TYPES, altFromFileName, formatBytes, validateImage } from './image-upload';

interface Upload {
  id: number;
  name: string;
  percent: number;
}

/**
 * Biblioteca de imagens: envio (botão ou arrastar e soltar) com progresso e
 * grade das imagens. No modo `selectable`, serve para escolher uma imagem
 * (ex.: capa do post); senão, permite editar o texto alternativo, copiar o
 * Markdown e excluir.
 */
@Component({
  selector: 'app-media-library',
  templateUrl: './media-library.html',
  styleUrl: './media-library.scss',
})
export class MediaLibrary {
  readonly selectable = input(false, { transform: booleanAttribute });
  readonly picked = output<Media>();

  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private nextUploadId = 0;

  protected readonly accept = ACCEPTED_IMAGE_TYPES.join(',');
  protected readonly page = signal(1);
  protected readonly media = this.api.media(() => this.page());
  protected readonly response = computed(() =>
    this.media.hasValue() ? this.media.value() : undefined,
  );
  protected readonly uploads = signal<Upload[]>([]);
  protected readonly dragging = signal(false);
  protected readonly formatBytes = formatBytes;

  upload(files: Iterable<File>): void {
    for (const file of files) {
      const error = validateImage(file);
      if (error) {
        this.toast.error(error);
        continue;
      }

      const upload: Upload = { id: this.nextUploadId++, name: file.name, percent: 0 };
      this.uploads.update((list) => [...list, upload]);

      this.api.uploadMedia(file, altFromFileName(file.name)).subscribe({
        next: (event) => {
          if (event.kind === 'progress') {
            this.uploads.update((list) =>
              list.map((item) =>
                item.id === upload.id ? { ...item, percent: event.percent } : item,
              ),
            );

            return;
          }

          this.finishUpload(upload.id);
          this.page.set(1);
          this.media.reload();
          this.toast.success(`"${file.name}" enviada.`);

          if (this.selectable()) {
            this.picked.emit(event.media);
          }
        },
        error: (error: unknown) => {
          this.finishUpload(upload.id);
          this.toast.error(this.uploadErrorMessage(file.name, error));
        },
      });
    }
  }

  protected onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.upload(Array.from(input.files ?? []));
    input.value = '';
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.upload(Array.from(event.dataTransfer?.files ?? []));
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected async copy(media: Media): Promise<void> {
    try {
      await navigator.clipboard.writeText(media.markdown);
      this.toast.success('Markdown copiado. Cole no conteúdo do post.');
    } catch {
      this.toast.error('Não foi possível copiar. Selecione o texto manualmente.');
    }
  }

  protected saveAlt(media: Media, alt: string): void {
    this.api.updateMediaAlt(media.id, alt.trim() || null).subscribe({
      next: () => {
        this.media.reload();
        this.toast.success('Texto alternativo atualizado.');
      },
      error: () => this.toast.error('Não foi possível salvar o texto alternativo.'),
    });
  }

  protected remove(media: Media): void {
    if (!confirm(`Excluir "${media.original_name}"? O arquivo será apagado.`)) {
      return;
    }

    this.api.deleteMedia(media.id).subscribe({
      next: () => {
        this.media.reload();
        this.toast.success(`"${media.original_name}" excluída.`);
      },
      error: (error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 409
          ? this.toast.warning(
              `"${media.original_name}" está em uso como capa ou no conteúdo de um post ou página e não pode ser excluída.`,
            )
          : this.toast.error(`Não foi possível excluir "${media.original_name}".`),
    });
  }

  private finishUpload(id: number): void {
    this.uploads.update((list) => list.filter((item) => item.id !== id));
  }

  private uploadErrorMessage(name: string, error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const detail = Object.values((error.error?.errors ?? {}) as Record<string, string[]>)[0]?.[0];

      return detail ? `"${name}": ${detail}` : `"${name}" foi recusada pela validação.`;
    }

    return `Não foi possível enviar "${name}".`;
  }
}
