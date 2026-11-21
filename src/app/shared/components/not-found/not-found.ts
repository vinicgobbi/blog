import { Component, RESPONSE_INIT, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/seo/seo.service';

const DEFAULT_TITLE = 'Página não encontrada';
const DEFAULT_MESSAGE = 'O endereço que você acessou não existe ou foi removido.';

function orDefault(fallback: string): (value: string | undefined) => string {
  return (value) => value ?? fallback;
}

/**
 * Estado "não encontrado". Ao ser exibido, responde 404 no SSR (para os
 * buscadores não indexarem a página de erro) e marca a página como noindex.
 * Também serve como página da rota curinga (`**`).
 */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="state">
        <i class="bi bi-signpost-split" aria-hidden="true"></i>
        <h1 class="section-title">{{ title() }}</h1>
        <p>{{ message() }}</p>
        <a class="btn btn-primary" routerLink="/">
          <i class="bi bi-arrow-left" aria-hidden="true"></i> Ir para o início
        </a>
      </div>
    </div>
  `,
})
export class NotFound {
  /*
   * Como página da rota curinga, o router (withComponentInputBinding) passa
   * `undefined` para inputs sem parâmetro correspondente; o transform mantém o padrão.
   */
  readonly title = input(DEFAULT_TITLE, { transform: orDefault(DEFAULT_TITLE) });
  readonly message = input(DEFAULT_MESSAGE, { transform: orDefault(DEFAULT_MESSAGE) });

  constructor() {
    const response = inject(RESPONSE_INIT, { optional: true });

    if (response) {
      response.status = 404;
    }

    const seo = inject(SeoService);
    effect(() => seo.update({ title: this.title(), noindex: true }));
  }
}
