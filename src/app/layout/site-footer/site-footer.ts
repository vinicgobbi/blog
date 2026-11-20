import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';

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
}
