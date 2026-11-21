import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { API_URL } from '../../../core/api';
import { LoginPage } from './login-page';

const API = 'http://api.test/api';

function render(redirect?: string) {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
      { provide: PLATFORM_ID, useValue: 'browser' },
    ],
  });
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(LoginPage);
  if (redirect !== undefined) {
    fixture.componentRef.setInput('redirect', redirect);
  }
  fixture.detectChanges();

  return {
    fixture,
    router,
    http: TestBed.inject(HttpTestingController),
    element: fixture.nativeElement as HTMLElement,
  };
}

function type(element: HTMLElement, selector: string, value: string): void {
  const input = element.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('blur'));
}

async function submitCredentials(
  fixture: ComponentFixture<LoginPage>,
  element: HTMLElement,
): Promise<void> {
  type(element, '#login-email', 'admin@blog.test');
  type(element, '#login-senha', 'senha-correta');
  await fixture.whenStable();
  element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  await fixture.whenStable();
}

describe('LoginPage', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  it('is not indexed by search engines', () => {
    render();

    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe('noindex, follow');
  });

  it('does not call the API with empty fields and shows validation messages', async () => {
    const { fixture, http, element } = render();

    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();

    http.expectNone(`${API}/auth/login`);
    expect(element.querySelector('#login-email-erro')?.textContent).toContain(
      'Informe seu e-mail.',
    );
    expect(element.querySelector('#login-senha-erro')?.textContent).toContain('Informe sua senha.');
  });

  it('logs in and goes to the page that required authentication', async () => {
    const { fixture, http, element, router } = render('/admin/posts');

    await submitCredentials(fixture, element);
    const request = http.expectOne(`${API}/auth/login`);
    expect(request.request.body).toEqual({ email: 'admin@blog.test', password: 'senha-correta' });
    request.flush({ access_token: 'token-1', token_type: 'bearer', expires_in: 7200 });
    http
      .expectOne(`${API}/auth/user`)
      .flush({ data: { id: 1, name: 'Admin', email: 'admin@blog.test' } });

    await vi.waitFor(() => expect(router.navigateByUrl).toHaveBeenCalledWith('/admin/posts'));
  });

  it('ignores an external redirect and goes to the dashboard instead', async () => {
    const { fixture, http, element, router } = render('https://site-malicioso.example');

    await submitCredentials(fixture, element);
    http
      .expectOne(`${API}/auth/login`)
      .flush({ access_token: 'token-1', token_type: 'bearer', expires_in: 7200 });
    http
      .expectOne(`${API}/auth/user`)
      .flush({ data: { id: 1, name: 'Admin', email: 'admin@blog.test' } });

    await vi.waitFor(() => expect(router.navigateByUrl).toHaveBeenCalledWith('/admin'));
  });

  it('shows a clear message for wrong credentials', async () => {
    const { fixture, http, element, router } = render();

    await submitCredentials(fixture, element);
    http
      .expectOne(`${API}/auth/login`)
      .flush({ message: 'Credenciais inválidas.' }, { status: 401, statusText: 'Unauthorized' });

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        'E-mail ou senha incorretos.',
      );
    });
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('asks to wait after too many attempts', async () => {
    const { fixture, http, element } = render();

    await submitCredentials(fixture, element);
    http
      .expectOne(`${API}/auth/login`)
      .flush(null, { status: 429, statusText: 'Too Many Requests' });

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('[role="alert"]')?.textContent).toContain('Aguarde um minuto');
    });
  });
});
