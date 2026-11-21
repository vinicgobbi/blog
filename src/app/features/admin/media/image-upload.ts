import { HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, filter, map } from 'rxjs';
import { ResourceResponse } from '../../../shared/models/api';
import { Media } from '../../../shared/models/admin';

/** Mesmos limites da API (StoreMediaRequest). */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type UploadEvent = { kind: 'progress'; percent: number } | { kind: 'done'; media: Media };

/** Valida a imagem antes de enviar; retorna a mensagem de erro ou null. */
export function validateImage(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `"${file.name}" não é uma imagem JPG, PNG, WebP ou GIF.`;
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return `"${file.name}" tem mais de 5 MB.`;
  }

  return null;
}

/** Texto alternativo inicial a partir do nome do arquivo (ex.: "pôr-do-sol.jpg" → "pôr do sol"). */
export function altFromFileName(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

/** Converte os eventos HTTP do upload em progresso (0–100) e no resultado final. */
export function toUploadEvents(
  events: Observable<HttpEvent<ResourceResponse<Media>>>,
): Observable<UploadEvent> {
  return events.pipe(
    filter(
      (event) =>
        event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response,
    ),
    map((event): UploadEvent => {
      if (event.type === HttpEventType.Response) {
        return { kind: 'done', media: event.body!.data };
      }

      const total = event.total ?? 0;

      return { kind: 'progress', percent: total ? Math.round((event.loaded / total) * 100) : 0 };
    }),
  );
}

/** Tamanho legível em pt-BR (ex.: 1,5 MB). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }

  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${units[unit]}`;
}
