import { Component, inject, input, linkedSignal } from '@angular/core';
import { FormField, form, maxLength } from '@angular/forms/signals';
import { Router } from '@angular/router';

/** Mesmo limite da API (`q` com no máximo 100 caracteres). */
export const SEARCH_MAX_LENGTH = 100;

/**
 * Campo de busca de posts por título e resumo. Ao enviar, leva para a página
 * inicial com o termo na URL (`/?q=termo`), então a busca pode ser compartilhada.
 */
@Component({
  selector: 'app-search-form',
  imports: [FormField],
  templateUrl: './search-form.html',
  styleUrl: './search-form.scss',
})
export class SearchForm {
  /** Termo buscado no momento (vindo da URL). */
  readonly q = input('');

  private readonly router = inject(Router);

  /** Campo do formulário, sincronizado com o termo da URL. */
  protected readonly model = linkedSignal(() => ({ q: this.q() }));
  protected readonly searchForm = form(this.model, (path) => {
    maxLength(path.q, SEARCH_MAX_LENGTH, {
      message: `A busca pode ter no máximo ${SEARCH_MAX_LENGTH} caracteres.`,
    });
  });

  protected search(event: Event): void {
    event.preventDefault();

    if (this.searchForm().invalid()) {
      this.searchForm.q().markAsTouched();

      return;
    }

    const term = this.model().q.trim();
    void this.router.navigate(['/'], { queryParams: { q: term || null } });
  }
}
