import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-site-footer',
  template: `
    <footer class="site-footer">
      <div class="container">
        <p>© {{ year }} {{ siteName }}</p>
        <a [href]="feedUrl">Assine o feed RSS</a>
      </div>
    </footer>
  `,
  styles: `
    .site-footer {
      margin-top: 4rem;
      border-top: 1px solid var(--color-border);
      color: var(--color-muted);
      font-size: 0.9375rem;
    }

    .container {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: space-between;
      padding-block: 2rem;
    }

    p {
      margin: 0;
    }
  `,
})
export class SiteFooter {
  protected readonly siteName = environment.siteName;
  protected readonly feedUrl = environment.feedUrl;
  protected readonly year = new Date().getFullYear();
}
