import { Component, computed, inject } from '@angular/core';
import { APP_VERSION } from '../../core/version';
import { environment } from '../../../environments/environment';
import { BlogApi } from '../../features/blog/blog-api';

@Component({
  selector: 'app-site-footer',
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
})
export class SiteFooter {
  protected readonly siteName = environment.siteName;
  protected readonly feedUrl = environment.feedUrl;
  protected readonly portfolioUrl = environment.portfolioUrl;
  protected readonly year = new Date().getFullYear();
  protected readonly appVersion = APP_VERSION;

  private readonly status = inject(BlogApi).status();
  /** Versão da API; "indisponível" se a requisição falhar e reticências enquanto carrega. */
  protected readonly apiVersion = computed(() => {
    if (this.status.error()) {
      return 'indisponível';
    }

    return this.status.hasValue() ? `v${this.status.value()?.version}` : '…';
  });
}
