import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../../../core/api';
import { AUTH_TOKEN_STORAGE_KEY, AuthService } from '../../../core/auth/auth.service';
import { AdminLayout } from './admin-layout';

const API = 'http://api.test/api';

async function render() {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'token-1');
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
      { provide: PLATFORM_ID, useValue: 'browser' },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const auth = TestBed.inject(AuthService);
  const loading = firstValueFrom(auth.loadUser());
  http
    .expectOne(`${API}/auth/user`)
    .flush({ data: { id: 1, name: 'Vinícius', email: 'admin@blog.test' } });
  await loading;

  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(AdminLayout);
  fixture.detectChanges();

  return { fixture, http, auth, router, element: fixture.nativeElement as HTMLElement };
}

describe('AdminLayout', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  it('shows the logged-in admin and the administration menu', async () => {
    const { element } = await render();

    expect(element.querySelector('.admin-bar__user')?.textContent).toContain('Vinícius');
    expect(element.querySelector('nav[aria-label="Administração"] a')?.textContent).toContain(
      'Dashboard',
    );
  });

  it('logs out, ending the session, and returns to the login page', async () => {
    const { fixture, http, auth, router, element } = await render();

    [...element.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Sair'))!
      .click();
    http.expectOne(`${API}/auth/logout`).flush({ message: 'ok' });
    await fixture.whenStable();

    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/login']);
  });
});
