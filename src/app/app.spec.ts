import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../environments/environment';
import { App } from './app';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('renders skip link pointing to the main content', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    const skipLink = element.querySelector<HTMLAnchorElement>('a.skip-link');
    expect(skipLink?.getAttribute('href')).toBe('#conteudo');
    expect(element.querySelector('main#conteudo')).not.toBeNull();
  });

  it('renders site name, main navigation and RSS links', async () => {
    const fixture = TestBed.createComponent(App);
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
