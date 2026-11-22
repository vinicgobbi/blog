import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { API_URL } from './core/api';
import { routes } from './app.routes';

describe('routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://api.test/api' },
      ],
    });
  });

  it('redirects the old search URL to the home page keeping the term', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/busca?q=angular&page=2');

    expect(router.url).toBe('/?q=angular');
  });

  it('redirects the old search URL without a term to the home page', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/busca');

    expect(router.url).toBe('/');
  });
});
