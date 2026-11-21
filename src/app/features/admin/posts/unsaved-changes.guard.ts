import { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Pede confirmação antes de sair de uma tela com alterações não salvas. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  !component.hasUnsavedChanges() || confirm('Há alterações não salvas. Deseja sair mesmo assim?');
