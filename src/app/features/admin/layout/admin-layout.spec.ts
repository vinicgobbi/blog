import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../../../core/api';
import { AUTH_TOKEN_STORAGE_KEY, AuthService } from '../../../core/auth/auth.service';
import { stubWideScreen } from '../../../../testing/wide-screen';
import { AdminLayout } from './admin-layout';

const API = 'http://api.test/api';

async function render(pending = 0) {
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
  http
    .expectOne(`${API}/admin/comments/counts`)
    .flush({ data: { pending, approved: 4, rejected: 0, spam: 1 } });
  await fixture.whenStable();

  return { fixture, http, auth, router, element: fixture.nativeElement as HTMLElement };
}

/** Recolhe o menu e foca o item (a dica aparece na hora); retorna a dica exibida. */
async function hoverCollapsed(
  fixture: ComponentFixture<AdminLayout>,
  link: HTMLElement,
): Promise<HTMLElement | null> {
  (fixture.nativeElement as HTMLElement)
    .querySelector<HTMLButtonElement>('.sidebar__collapse')!
    .click();
  await fixture.whenStable();
  link.dispatchEvent(new FocusEvent('focusin'));

  return document.querySelector<HTMLElement>('.tooltip');
}

describe('AdminLayout', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
    document.documentElement.removeAttribute('data-sidebar-admin');
  });

  it('shows the logged-in admin and the administration menu', async () => {
    const { element } = await render();

    expect(element.querySelector('.admin-user')?.textContent).toContain('Vinícius');
    expect(element.querySelector('nav[aria-label="Administração"] a')?.textContent).toContain(
      'Dashboard',
    );
  });

  it('shows the number of pending comments next to the menu item', async () => {
    const { element } = await render(3);

    const link = [...element.querySelectorAll('nav[aria-label="Administração"] a')].find((a) =>
      a.textContent?.includes('Comentários'),
    )!;
    expect(link.getAttribute('href')).toBe('/admin/comentarios');
    expect(
      link.querySelector('.sidebar-link__badge')?.textContent?.replace(/\s+/g, ' ').trim(),
    ).toBe('3 pendentes');
  });

  it('includes the pending comments in the tooltip of the collapsed menu item', async () => {
    const restoreScreen = stubWideScreen();
    const { fixture, element } = await render(1);

    const link = element.querySelector<HTMLElement>('a[href="/admin/comentarios"]')!;
    const tooltip = await hoverCollapsed(fixture, link);
    restoreScreen();
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(tooltip?.textContent).toBe('Comentários (1 pendente)');
  });

  it('hides the badge when there are no pending comments', async () => {
    const { element } = await render(0);

    expect(element.querySelector('.sidebar-link__badge')).toBeNull();
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
