import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ThemeService } from '../../core/theme/theme.service';
import { BlogApi } from '../../features/blog/blog-api';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
})
export class SiteHeader {
  protected readonly theme = inject(ThemeService);
  protected readonly siteName = environment.siteName;
  protected readonly feedUrl = environment.feedUrl;

  private readonly pagesResource = inject(BlogApi).pages();
  /** Páginas publicadas (ex.: Sobre); se a API falhar, o menu fica só com os links fixos. */
  protected readonly pages = computed(() =>
    this.pagesResource.hasValue() ? (this.pagesResource.value()?.data ?? []) : [],
  );
}
