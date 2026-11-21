import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../../core/api';
import { APP_VERSION } from '../../core/version';
import { SiteFooter } from './site-footer';

const API = 'http://api.test/api';

function render() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
    ],
  });
  const fixture = TestBed.createComponent(SiteFooter);
  fixture.detectChanges();

  return {
    fixture,
    http: TestBed.inject(HttpTestingController),
    versions: () =>
      (fixture.nativeElement as HTMLElement)
        .querySelector('.footer__versions')
        ?.textContent?.replace(/\s+/g, ' ')
        .trim(),
  };
}

describe('SiteFooter', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('shows the front version and the API version', async () => {
    const { fixture, http, versions } = render();

    expect(versions()).toBe(`Front v${APP_VERSION} · API …`);

    http.expectOne(API).flush({
      api: 'Blog API',
      status: 'online',
      version: '1.4.2',
      documentation: 'http://api.test/api/documentation',
    });
    await fixture.whenStable();

    expect(versions()).toBe(`Front v${APP_VERSION} · API v1.4.2`);
  });

  it('says the API is unavailable when the request fails', async () => {
    const { fixture, http, versions } = render();

    http.expectOne(API).flush(null, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();

    expect(versions()).toBe(`Front v${APP_VERSION} · API indisponível`);
  });
});
