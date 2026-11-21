import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_URL } from '../../../core/api';
import { AdminPage } from '../../../shared/models/admin';
import { PageListPage } from './page-list-page';

registerLocaleData(localePt, 'pt-BR');

const API = 'http://api.test/api';

const PAGES: AdminPage[] = [
  {
    id: 1,
    title: 'Sobre',
    slug: 'sobre',
    icon: 'person',
    is_published: true,
    created_at: '2026-11-20T10:00:00-03:00',
    updated_at: '2026-11-20T10:00:00-03:00',
  },
  {
    id: 2,
    title: 'Contato',
    slug: 'contato',
    icon: 'envelope',
    is_published: false,
    created_at: '2026-11-20T10:00:00-03:00',
    updated_at: '2026-11-20T10:00:00-03:00',
  },
];

async function render() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
      { provide: LOCALE_ID, useValue: 'pt-BR' },
    ],
  });
  const fixture = TestBed.createComponent(PageListPage);
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne(`${API}/admin/pages`).flush({ data: PAGES });
  await fixture.whenStable();

  return { fixture, http, element: fixture.nativeElement as HTMLElement };
}

describe('PageListPage', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
  });

  it('lists pages with their state and links', async () => {
    const { element } = await render();

    const rows = element.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector('.badge')?.textContent?.trim()).toBe('Publicada');
    expect(rows[1].querySelector('.badge')?.textContent?.trim()).toBe('Rascunho');
    expect(rows[0].querySelector('a.table__title')?.getAttribute('href')).toBe('/admin/paginas/1');
    expect(rows[0].querySelector('a.table__title i.bi-person')).not.toBeNull();
    expect(rows[1].querySelector('a.table__title i.bi-envelope')).not.toBeNull();
    expect(rows[0].querySelector('a[href="/sobre"]')).not.toBeNull();
    expect(rows[1].querySelector('a[href="/contato"]')).toBeNull();
  });

  it('deletes a page after confirmation and reloads the list', async () => {
    const { fixture, http, element } = await render();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    element.querySelector<HTMLButtonElement>('button[aria-label="Excluir Sobre"]')!.click();

    expect(confirm.mock.calls[0][0]).toContain('Ela sai do blog imediatamente.');
    http
      .expectOne({ method: 'DELETE', url: `${API}/admin/pages/1` })
      .flush(null, { status: 204, statusText: 'No Content' });
    (await vi.waitFor(() => http.expectOne(`${API}/admin/pages`))).flush({ data: [PAGES[1]] });
    await fixture.whenStable();
  });

  it('does nothing when the deletion is not confirmed', async () => {
    const { http, element } = await render();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    element.querySelector<HTMLButtonElement>('button[aria-label="Excluir Contato"]')!.click();

    http.expectNone({ method: 'DELETE', url: `${API}/admin/pages/2` });
  });
});
