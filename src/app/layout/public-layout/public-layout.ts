import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteFooter } from '../site-footer/site-footer';
import { SiteSidebar } from '../site-sidebar/site-sidebar';

/**
 * Casca das páginas públicas do blog: menu lateral, conteúdo e rodapé.
 */
@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, SiteSidebar, SiteFooter],
  template: `
    <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <app-site-sidebar />
    <div class="layout__content">
      <main id="conteudo" class="page" tabindex="-1">
        <router-outlet />
      </main>
      <app-site-footer />
    </div>
  `,
  host: { class: 'layout layout--sidebar' },
})
export class PublicLayout {}
