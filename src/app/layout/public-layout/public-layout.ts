import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Halloween, Natal } from '@vinicgobbi/ui/seasonal';
import { SiteFooter } from '../site-footer/site-footer';
import { SiteSidebar } from '../site-sidebar/site-sidebar';

/**
 * Casca das páginas públicas do blog: menu lateral, conteúdo, rodapé e as decorações de Natal
 * (dezembro) e Halloween (31/10). O admin fica sem decoração.
 */
@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, SiteSidebar, SiteFooter, Natal, Halloween],
  template: `
    <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <app-site-sidebar />
    <div class="layout__content">
      <main id="conteudo" class="page" tabindex="-1">
        <router-outlet />
      </main>
      <app-site-footer />
    </div>
    <vg-natal />
    <vg-halloween />
  `,
  host: { class: 'layout layout--sidebar' },
})
export class PublicLayout {}
