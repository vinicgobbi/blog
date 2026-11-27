import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Seasonal } from '@vinicgobbi/ui/seasonal';
import { SiteFooter } from '../site-footer/site-footer';
import { SiteSidebar } from '../site-sidebar/site-sidebar';

/**
 * Casca das páginas públicas do blog: menu lateral, conteúdo, rodapé e as decorações das datas
 * comemorativas (Ano Novo, Carnaval, Páscoa, aniversário, Halloween e Natal). O admin fica sem
 * decoração.
 */
@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, SiteSidebar, SiteFooter, Seasonal],
  template: `
    <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <app-site-sidebar />
    <div class="layout__content">
      <main id="conteudo" class="page" tabindex="-1">
        <router-outlet />
      </main>
      <app-site-footer />
    </div>
    <!-- Carregadas à parte quando o navegador fica ocioso: só aparecem nas datas. -->
    @defer (on idle) {
      <vg-seasonal />
    }
  `,
  host: { class: 'layout layout--sidebar' },
})
export class PublicLayout {}
