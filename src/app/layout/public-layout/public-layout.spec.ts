import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { PublicLayout } from './public-layout';

describe('PublicLayout', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('renders skip link pointing to the main content', async () => {
    const fixture = TestBed.createComponent(PublicLayout);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    const skipLink = element.querySelector<HTMLAnchorElement>('a.skip-link');
    expect(skipLink?.getAttribute('href')).toBe('#conteudo');
    expect(element.querySelector('main#conteudo')).not.toBeNull();
  });

  it('toggles the theme from the header button with an accessible label', async () => {
    const fixture = TestBed.createComponent(PublicLayout);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    document.documentElement.setAttribute('data-theme', 'dark');
    const button = element.querySelector<HTMLButtonElement>('header button');

    expect(button?.getAttribute('aria-label')).toBe('Ativar tema claro');
    button?.click();
    await fixture.whenStable();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(button?.getAttribute('aria-label')).toBe('Ativar tema escuro');
  });

  it('renders site name, main navigation and RSS links', async () => {
    const fixture = TestBed.createComponent(PublicLayout);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.brand')?.textContent).toContain(environment.siteName);
    expect(element.querySelector('nav[aria-label="Principal"]')).not.toBeNull();
    const rssLinks = [...element.querySelectorAll<HTMLAnchorElement>('a')].filter(
      (link) => link.getAttribute('href') === environment.feedUrl,
    );
    expect(rssLinks.length).toBe(2);
  });
});
