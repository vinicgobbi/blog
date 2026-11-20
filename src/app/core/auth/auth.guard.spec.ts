import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_URL } from '../api';
import { authGuard } from './auth.guard';
import { AUTH_TOKEN_STORAGE_KEY, AuthService } from './auth.service';

const API = 'http://api.test/api';

@Component({ selector: 'app-dashboard-stub', template: 'painel' })
class DashboardStub {}

@Component({ selector: 'app-login-stub', template: 'login' })
class LoginStub {}

async function setup(storedToken: string | null) {
  if (storedToken) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, storedToken);
  }

  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([
        { path: 'admin/login', component: LoginStub },
        { path: 'admin/painel', component: DashboardStub, canActivate: [authGuard] },
      ]),
      { provide: API_URL, useValue: API },
      { provide: PLATFORM_ID, useValue: 'browser' },
    ],
  });

  return {
    harness: await RouterTestingHarness.create(),
    http: TestBed.inject(HttpTestingController),
    auth: TestBed.inject(AuthService),
  };
}

describe('authGuard', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('redirects visitors without a session to login, keeping the requested URL', async () => {
    const { harness } = await setup(null);

    await harness.navigateByUrl('/admin/painel');

    expect(harness.routeNativeElement?.textContent).toContain('login');
    expect(TestBed.inject(Router).url).toBe('/admin/login?redirect=%2Fadmin%2Fpainel');
  });

  it('validates a saved token on the API before allowing access', async () => {
    const { harness, http, auth } = await setup('token-salvo');

    const navigation = harness.navigateByUrl('/admin/painel');
    const userRequest = await vi.waitFor(() => http.expectOne(`${API}/auth/user`));
    userRequest.flush({ data: { id: 1, name: 'Admin', email: 'admin@blog.test' } });
    await navigation;

    expect(harness.routeNativeElement?.textContent).toContain('painel');
    expect(auth.user()?.email).toBe('admin@blog.test');
  });

  it('clears the session and redirects to login when the saved token is rejected', async () => {
    const { harness, http, auth } = await setup('token-invalido');

    const navigation = harness.navigateByUrl('/admin/painel');
    const userRequest = await vi.waitFor(() => http.expectOne(`${API}/auth/user`));
    userRequest.flush(null, { status: 401, statusText: 'Unauthorized' });
    await navigation;

    expect(harness.routeNativeElement?.textContent).toContain('login');
    expect(auth.isAuthenticated()).toBe(false);
  });
});
