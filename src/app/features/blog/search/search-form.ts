import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { FormField, form, maxLength } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { SeasonalGreeting } from '@vinicgobbi/ui/seasonal';

/** Mesmo limite da API (`q` com no máximo 100 caracteres). */
export const SEARCH_MAX_LENGTH = 100;

/**
 * Campo de busca de posts por título e resumo. Ao enviar, leva para a página
 * inicial com o termo na URL (`/?q=termo`), então a busca pode ser compartilhada.
 *
 * Nas datas comemorativas, a saudação entra no placeholder e o emoji da data vai
 * para o botão, que solta a revoada da decoração ao buscar.
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
  protected readonly seasonal = inject(SeasonalGreeting);

  protected readonly placeholder = computed(() => {
    const text = this.seasonal.text();

    return text
      ? `${text.message} Busque posts por título ou resumo…`
      : 'Buscar posts por título ou resumo…';
  });

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

    this.releaseSeasonalBurst(event);

    const term = this.model().q.trim();
    void this.router.navigate(['/'], { queryParams: { q: term || null } });
  }

  /** Nas datas comemorativas, a revoada sai do botão de buscar. */
  private releaseSeasonalBurst(event: Event): void {
    const button = (event as SubmitEvent).submitter;

    if (!this.seasonal.text() || !button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    this.seasonal.release({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }
}
