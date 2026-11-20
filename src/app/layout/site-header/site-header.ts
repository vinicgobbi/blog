import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="site-header">
      <div class="container">
        <a class="brand" routerLink="/">{{ siteName }}</a>
        <nav aria-label="Principal">
          <ul>
            <li>
              <a
                routerLink="/"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: true }"
                ariaCurrentWhenActive="page"
                >Início</a
              >
            </li>
            <li><a [href]="feedUrl">RSS</a></li>
          </ul>
        </nav>
      </div>
    </header>
  `,
  styleUrl: './site-header.scss',
})
export class SiteHeader {
  protected readonly siteName = environment.siteName;
  protected readonly feedUrl = environment.feedUrl;
}
