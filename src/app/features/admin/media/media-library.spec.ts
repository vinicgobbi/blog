import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '../../../core/api';
import { PaginatedResponse } from '../../../shared/models/api';
import { Media } from '../../../shared/models/admin';
import { shownToasts } from '../../../../testing/toasts';
import { MediaLibrary } from './media-library';

const API = 'http://api.test/api';
const MEDIA_URL = `${API}/admin/media`;

function media(overrides: Partial<Media> = {}): Media {
  return {
    id: 1,
    url: 'http://api.test/storage/media/2026/11/a.png',
    path: 'media/2026/11/a.png',
    original_name: 'foto.png',
    mime_type: 'image/png',
    size: 2048,
    width: 800,
    height: 600,
    alt: 'Uma foto',
    markdown: '![Uma foto](http://api.test/storage/media/2026/11/a.png)',
    created_at: '2026-11-20T10:00:00-03:00',
    ...overrides,
  };
}

function page(items: Media[]): PaginatedResponse<Media> {
  return {
    data: items,
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: 1,
      from: 1,
      last_page: 1,
      per_page: 30,
      to: items.length,
      total: items.length,
    },
  };
}

async function render(selectable = false, items: Media[] = [media()]) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
    ],
  });
  const fixture = TestBed.createComponent(MediaLibrary);
  fixture.componentRef.setInput('selectable', selectable);
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne(MEDIA_URL).flush(page(items));
  await fixture.whenStable();

  return { fixture, http, element: fixture.nativeElement as HTMLElement };
}

function chooseFiles(element: HTMLElement, files: File[]): void {
  const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  input.dispatchEvent(new Event('change'));
}

/** O reload da lista dispara a requisição na próxima detecção de mudanças. */
async function flushReload(
  fixture: ComponentFixture<MediaLibrary>,
  http: HttpTestingController,
  items: Media[],
): Promise<void> {
  const request = await vi.waitFor(() => {
    fixture.detectChanges();

    return http.expectOne(MEDIA_URL);
  });
  request.flush(page(items));
}

describe('MediaLibrary', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
  });

  it('shows the images with name, dimensions and size', async () => {
    const { element } = await render();

    expect(element.querySelector('.item__name')?.textContent).toContain('foto.png');
    expect(element.querySelector('.item__meta')?.textContent).toContain('800×600');
    expect(element.querySelector('.item__meta')?.textContent).toContain('2 KB');
    expect(element.querySelector('.item img')?.getAttribute('alt')).toBe('Uma foto');
  });

  it('uploads a valid image with an alt text derived from its name and reloads the list', async () => {
    const { fixture, http, element } = await render();

    chooseFiles(element, [new File(['x'], 'pôr-do-sol.png', { type: 'image/png' })]);
    const request = http.expectOne({ method: 'POST', url: MEDIA_URL });
    const body = request.request.body as FormData;
    expect((body.get('file') as File).name).toBe('pôr-do-sol.png');
    expect(body.get('alt')).toBe('pôr do sol');
    request.flush(
      { data: media({ id: 2, original_name: 'pôr-do-sol.png' }) },
      { status: 201, statusText: 'Created' },
    );

    await flushReload(fixture, http, [media({ id: 2, original_name: 'pôr-do-sol.png' }), media()]);
    expect(shownToasts()).toEqual([{ kind: 'success', message: '"pôr-do-sol.png" enviada.' }]);
  });

  it('rejects invalid files before sending them', async () => {
    const { http, element } = await render();

    chooseFiles(element, [new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' })]);

    http.expectNone({ method: 'POST', url: MEDIA_URL });
    expect(shownToasts()).toEqual([{ kind: 'error', message: expect.stringContaining('doc.pdf') }]);
  });

  it('explains that an image in use cannot be deleted (409)', async () => {
    const { http, element } = await render();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    element.querySelector<HTMLButtonElement>('button[aria-label="Excluir foto.png"]')!.click();
    http
      .expectOne({ method: 'DELETE', url: `${MEDIA_URL}/1` })
      .flush({ message: 'em uso' }, { status: 409, statusText: 'Conflict' });

    expect(shownToasts()).toEqual([
      { kind: 'warning', message: expect.stringContaining('está em uso') },
    ]);
  });

  it('saves the alt text', async () => {
    const { fixture, http, element } = await render();
    const input = element.querySelector<HTMLInputElement>('#alt-1')!;
    input.value = '  Nova descrição  ';

    input.form!.dispatchEvent(new Event('submit', { cancelable: true }));
    const request = http.expectOne({ method: 'PUT', url: `${MEDIA_URL}/1` });
    expect(request.request.body).toEqual({ alt: 'Nova descrição' });
    request.flush({ data: media({ alt: 'Nova descrição' }) });
    await flushReload(fixture, http, [media({ alt: 'Nova descrição' })]);

    expect(shownToasts()).toEqual([{ kind: 'success', message: 'Texto alternativo atualizado.' }]);
  });

  it('emits the chosen image in selectable mode', async () => {
    const { fixture, element } = await render(true);
    const picked: Media[] = [];
    fixture.componentInstance.picked.subscribe((item) => picked.push(item));

    expect(element.querySelector('button[aria-label^="Excluir"]')).toBeNull();
    [...element.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Usar esta imagem'))!
      .click();

    expect(picked.map((item) => item.path)).toEqual(['media/2026/11/a.png']);
  });
});
