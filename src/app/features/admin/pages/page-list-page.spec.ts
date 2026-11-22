import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_URL } from '../../../core/api';
import { AdminPage } from '../../../shared/models/admin';
import { shownToasts } from '../../../../testing/toasts';
import { PageListPage, movePage, movePageTo } from './page-list-page';

registerLocaleData(localePt, 'pt-BR');

const API = 'http://api.test/api';

const PAGES: AdminPage[] = [
  {
    id: 1,
    title: 'Sobre',
    slug: 'sobre',
    icon: 'person',
    position: 1,
    is_published: true,
    created_at: '2026-11-20T10:00:00-03:00',
    updated_at: '2026-11-20T10:00:00-03:00',
  },
  {
    id: 2,
    title: 'Contato',
    slug: 'contato',
    icon: 'envelope',
    position: 2,
    is_published: false,
    created_at: '2026-11-20T10:00:00-03:00',
    updated_at: '2026-11-20T10:00:00-03:00',
  },
  {
    id: 3,
    title: 'Projetos',
    slug: 'projetos',
    icon: 'code-slash',
    position: 3,
    is_published: true,
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

function titles(element: HTMLElement): string[] {
  return [...element.querySelectorAll('tbody a.table__title')].map(
    (link) => link.textContent?.trim() ?? '',
  );
}

function button(element: HTMLElement, label: string): HTMLButtonElement {
  return element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
}

describe('movePage', () => {
  it('swaps the page with its neighbour', () => {
    expect(movePage(PAGES, 2, -1).map(({ id }) => id)).toEqual([2, 1, 3]);
    expect(movePage(PAGES, 2, 1).map(({ id }) => id)).toEqual([1, 3, 2]);
  });

  it('returns the same list when the page cannot move', () => {
    expect(movePage(PAGES, 1, -1)).toBe(PAGES);
    expect(movePage(PAGES, 3, 1)).toBe(PAGES);
    expect(movePage(PAGES, 99, 1)).toBe(PAGES);
  });
});

describe('movePageTo', () => {
  const ids = (pages: AdminPage[]) => pages.map(({ id }) => id);

  it('moves the page before the one at the target index', () => {
    expect(ids(movePageTo(PAGES, 3, 0))).toEqual([3, 1, 2]);
    expect(ids(movePageTo(PAGES, 1, 2))).toEqual([2, 1, 3]);
    expect(ids(movePageTo(PAGES, 1, 3))).toEqual([2, 3, 1]);
  });

  it('returns the same list when the page stays in place', () => {
    expect(movePageTo(PAGES, 2, 1)).toBe(PAGES);
    expect(movePageTo(PAGES, 2, 2)).toBe(PAGES);
    expect(movePageTo(PAGES, 99, 0)).toBe(PAGES);
  });
});

/** O jsdom não tem DragEvent: o evento recebe as propriedades usadas pelo componente. */
function drag(target: Element, type: string, clientY = 0): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, {
    clientY,
    dataTransfer: { setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: '', dropEffect: '' },
  });
  target.dispatchEvent(event);

  return event;
}

function row(element: HTMLElement, title: string): HTMLTableRowElement {
  return [...element.querySelectorAll<HTMLTableRowElement>('tbody tr')].find((tr) =>
    tr.textContent?.includes(title),
  )!;
}

function placeRow(tr: HTMLElement, top: number): void {
  vi.spyOn(tr, 'getBoundingClientRect').mockReturnValue({ top, height: 40 } as DOMRect);
}

describe('PageListPage', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
  });

  it('lists pages with their state and links', async () => {
    const { element } = await render();

    const rows = element.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
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

    expect(shownToasts()).toEqual([{ kind: 'success', message: 'Página "Sobre" excluída.' }]);
  });

  it('does nothing when the deletion is not confirmed', async () => {
    const { http, element } = await render();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    element.querySelector<HTMLButtonElement>('button[aria-label="Excluir Contato"]')!.click();

    http.expectNone({ method: 'DELETE', url: `${API}/admin/pages/2` });
  });

  it('shows the pages in menu order, without moving past the ends', async () => {
    const { element } = await render();

    expect(titles(element)).toEqual(['Sobre', 'Contato', 'Projetos']);
    expect(button(element, 'Mover Sobre para cima').disabled).toBe(true);
    expect(button(element, 'Mover Sobre para baixo').disabled).toBe(false);
    expect(button(element, 'Mover Projetos para baixo').disabled).toBe(true);
  });

  it('moves a page, saves the new order and announces it', async () => {
    const { fixture, http, element } = await render();

    button(element, 'Mover Contato para cima').click();
    await fixture.whenStable();

    expect(titles(element)).toEqual(['Contato', 'Sobre', 'Projetos']);
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Contato movida para a posição 1 de 3.',
    );
    // Chegou ao topo: o foco passa para o botão de descer da mesma página.
    expect(document.activeElement).toBe(button(element, 'Mover Contato para baixo'));

    const request = http.expectOne({ method: 'PUT', url: `${API}/admin/pages/order` });
    expect(request.request.body).toEqual({ ids: [2, 1, 3] });
    request.flush({
      data: [{ ...PAGES[1], position: 1 }, { ...PAGES[0], position: 2 }, PAGES[2]],
    });
    await fixture.whenStable();

    expect(titles(element)).toEqual(['Contato', 'Sobre', 'Projetos']);
    expect(shownToasts()).toEqual([]);
  });

  it('restores the saved order when saving fails', async () => {
    const { fixture, http, element } = await render();

    button(element, 'Mover Sobre para baixo').click();
    await fixture.whenStable();
    http
      .expectOne({ method: 'PUT', url: `${API}/admin/pages/order` })
      .flush({ message: 'Erro' }, { status: 422, statusText: 'Unprocessable Content' });

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(titles(element)).toEqual(['Sobre', 'Contato', 'Projetos']);
    });
    expect(shownToasts()).toEqual([
      { kind: 'error', message: 'Não foi possível salvar a nova ordem. Tente novamente.' },
    ]);
  });

  it('keeps only the latest order when moving again before the first save ends', async () => {
    const { fixture, http, element } = await render();

    button(element, 'Mover Projetos para cima').click();
    await fixture.whenStable();
    button(element, 'Mover Projetos para cima').click();
    await fixture.whenStable();

    const [first, second] = http.match({ method: 'PUT', url: `${API}/admin/pages/order` });
    expect(first.request.body).toEqual({ ids: [1, 3, 2] });
    expect(second.request.body).toEqual({ ids: [3, 1, 2] });

    first.flush({ data: [PAGES[0], PAGES[2], PAGES[1]] });
    await fixture.whenStable();
    expect(titles(element)).toEqual(['Projetos', 'Sobre', 'Contato']);

    second.flush({ message: 'Erro' }, { status: 500, statusText: 'Server Error' });

    // Volta para a última ordem que a API confirmou, e não para a original.
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(titles(element)).toEqual(['Sobre', 'Projetos', 'Contato']);
    });
  });

  it('drags a page by its handle to a new position and saves it', async () => {
    const { fixture, http, element } = await render();
    const target = row(element, 'Sobre');
    placeRow(target, 100);

    drag(row(element, 'Projetos').querySelector('.drag-handle')!, 'dragstart');
    fixture.detectChanges();
    expect(row(element, 'Projetos').classList).toContain('is-dragging');

    const dragOver = drag(target, 'dragover', 110);
    fixture.detectChanges();
    expect(dragOver.defaultPrevented).toBe(true);
    expect(target.classList).toContain('drop-before');

    drag(target, 'drop', 110);
    await fixture.whenStable();

    expect(titles(element)).toEqual(['Projetos', 'Sobre', 'Contato']);
    expect(element.querySelector('.is-dragging, .drop-before, .drop-after')).toBeNull();
    expect(http.expectOne({ method: 'PUT', url: `${API}/admin/pages/order` }).request.body).toEqual(
      { ids: [3, 1, 2] },
    );
  });

  it('drops after the row when the mouse is on its lower half', async () => {
    const { fixture, http, element } = await render();
    const target = row(element, 'Contato');
    placeRow(target, 100);

    drag(row(element, 'Sobre').querySelector('.drag-handle')!, 'dragstart');
    drag(target, 'dragover', 130);
    fixture.detectChanges();
    expect(target.classList).toContain('drop-after');
    drag(target, 'drop', 130);
    await fixture.whenStable();

    expect(http.expectOne({ method: 'PUT', url: `${API}/admin/pages/order` }).request.body).toEqual(
      { ids: [2, 1, 3] },
    );
  });

  it('does not save when the page is dropped where it already was', async () => {
    const { fixture, http, element } = await render();
    const target = row(element, 'Contato');
    placeRow(target, 100);

    drag(row(element, 'Sobre').querySelector('.drag-handle')!, 'dragstart');
    drag(target, 'dragover', 110);
    drag(target, 'drop', 110);
    await fixture.whenStable();

    expect(titles(element)).toEqual(['Sobre', 'Contato', 'Projetos']);
    http.expectNone({ method: 'PUT', url: `${API}/admin/pages/order` });
  });

  it('ignores drags that did not start on a page handle', async () => {
    const { element } = await render();

    const dragOver = drag(row(element, 'Sobre'), 'dragover', 110);

    expect(dragOver.defaultPrevented).toBe(false);
  });
});
