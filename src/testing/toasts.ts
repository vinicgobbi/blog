import { TestBed } from '@angular/core/testing';
import { ToastKind, ToastService } from '../app/shared/components/toast/toast.service';

/** Toasts visíveis no momento (do mais novo para o mais antigo), sem o id. */
export function shownToasts(): { kind: ToastKind; message: string }[] {
  return TestBed.inject(ToastService)
    .toasts()
    .map(({ kind, message }) => ({ kind, message }));
}
