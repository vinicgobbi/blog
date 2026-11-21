import { Component, DOCUMENT, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { handleInPageLinkClick } from './core/navigation/in-page-links';
import { SiteFooter } from './layout/site-footer/site-footer';
import { SiteHeader } from './layout/site-header/site-header';

@Component({
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  selector: 'app-root',
  templateUrl: './app.html',
  host: { '(document:click)': 'onDocumentClick($event)' },
})
export class App {
  private readonly document = inject(DOCUMENT);

  protected onDocumentClick(event: MouseEvent): void {
    handleInPageLinkClick(event, this.document);
  }
}
