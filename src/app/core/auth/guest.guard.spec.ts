import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_URL } from '../api';
import { AUTH_TOKEN_STORAGE_KEY } from './auth.service';
import { guestGuard } from './guest.guard';

@Component({ selector: 'app-login-stub', template: 'login' })
class LoginStub {}

@Component({ selector: 'app-admin-stub', template: 'painel' })
class AdminStub {}

async function navigateToLogin(storedToken: string | null) {
  localStorage.clear();
  if (storedToken) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, storedToken);
  }
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([
        { path: 'admin/login', component: LoginStub, canActivate: [guestGuard] },
        { path: 'admin', component: AdminStub },
      ]),
      { provide: API_URL, useValue: 'http://api.test/api' },
      { provide: PLATFORM_ID, useValue: 'browser' },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/admin/login');

  return TestBed.inject(Router).url;
}

describe('guestGuard', () => {
  afterEach(() => localStorage.clear());

  it('shows the login page to visitors without a session', async () => {
    expect(await navigateToLogin(null)).toBe('/admin/login');
  });

  it('sends an already logged-in admin to the dashboard', async () => {
    expect(await navigateToLogin('token-salvo')).toBe('/admin');
  });
});
