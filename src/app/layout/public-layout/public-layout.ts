import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteFooter } from '../site-footer/site-footer';
import { SiteHeader } from '../site-header/site-header';

/**
 * Casca das páginas públicas do blog: cabeçalho, conteúdo e rodapé.
 */
@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  template: `
    <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <app-site-header />
    <main id="conteudo" class="page" tabindex="-1">
      <router-outlet />
    </main>
    <app-site-footer />
  `,
  host: { class: 'layout' },
})
export class PublicLayout {}
