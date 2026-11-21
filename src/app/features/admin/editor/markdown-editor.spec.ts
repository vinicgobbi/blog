import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField, form, required } from '@angular/forms/signals';
import { API_URL } from '../../../core/api';
import { MarkdownEditor, PREVIEW_DEBOUNCE_MS } from './markdown-editor';

const API = 'http://api.test/api';
const PREVIEW_URL = `${API}/admin/markdown/preview`;

@Component({
  imports: [MarkdownEditor, FormField],
  template: `<app-markdown-editor inputId="conteudo" [formField]="editorForm.body" />`,
})
class Host {
  readonly model = signal({ body: 'um texto' });
  readonly editorForm = form(this.model);
}

@Component({
  imports: [MarkdownEditor, FormField],
  template: `<app-markdown-editor [formField]="editorForm.body" />`,
})
class RequiredHost {
  readonly model = signal({ body: '' });
  readonly editorForm = form(this.model, (path) => required(path.body));
}

/** Avança o relógio falso e roda a detecção de mudanças (onde os recursos disparam requisições). */
async function settle(fixture: ComponentFixture<Host>, ms = 0): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  fixture.detectChanges();
  await vi.advanceTimersByTimeAsync(0);
}

async function render() {
  vi.useFakeTimers();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
    ],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const http = TestBed.inject(HttpTestingController);

  // O conteúdo inicial é pré-visualizado assim que o editor abre, sem esperar digitação.
  await settle(fixture);
  http.expectOne(PREVIEW_URL).flush({ html: '<p>um texto</p>' });
  await settle(fixture);

  return {
    fixture,
    http,
    element,
    textarea: element.querySelector<HTMLTextAreaElement>('textarea')!,
  };
}

/** Responde a pré-visualização disparada por uma alteração (após o debounce). */
async function flushPreview(
  fixture: ComponentFixture<Host>,
  http: HttpTestingController,
): Promise<void> {
  await settle(fixture, PREVIEW_DEBOUNCE_MS);
  http.expectOne(PREVIEW_URL).flush({ html: '' });
  await settle(fixture);
}

describe('MarkdownEditor', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.useRealTimers();
  });

  it('shows the form value and writes edits back to the form', async () => {
    const { fixture, http, textarea } = await render();

    expect(textarea.value).toBe('um texto');
    textarea.value = 'novo conteúdo';
    textarea.dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.model().body).toBe('novo conteúdo');
    await flushPreview(fixture, http);
  });

  it('applies toolbar actions to the selected text', async () => {
    const { fixture, http, element, textarea } = await render();
    textarea.setSelectionRange(3, 8);

    element.querySelector<HTMLButtonElement>('button[aria-label^="Negrito"]')!.click();
    await settle(fixture);

    expect(fixture.componentInstance.model().body).toBe('um **texto**');
    expect(textarea.value).toBe('um **texto**');
    await flushPreview(fixture, http);
  });

  it('supports Ctrl+K to insert a link', async () => {
    const { fixture, http, textarea } = await render();
    textarea.setSelectionRange(3, 8);

    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true });
    textarea.dispatchEvent(event);
    await settle(fixture);

    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.model().body).toBe('um [texto](https://)');
    await flushPreview(fixture, http);
  });

  it('renders the preview from the API only after the user stops typing', async () => {
    const { fixture, http, element, textarea } = await render();
    textarea.value = 'um **texto**';
    textarea.dispatchEvent(new Event('input'));

    await settle(fixture, PREVIEW_DEBOUNCE_MS - 50);
    http.expectNone(PREVIEW_URL);

    await settle(fixture, 100);
    const request = http.expectOne(PREVIEW_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ markdown: 'um **texto**' });
    request.flush({ html: '<p>um <strong>texto</strong></p>' });
    await settle(fixture);

    expect(element.querySelector('.editor__preview .prose strong')?.textContent).toBe('texto');
  });

  it('uploads a chosen image, showing a placeholder until it is replaced by the image Markdown', async () => {
    const { fixture, http, element, textarea } = await render();
    textarea.setSelectionRange(8, 8);

    const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', {
      value: [new File(['x'], 'foto.png', { type: 'image/png' })],
      configurable: true,
    });
    input.dispatchEvent(new Event('change'));
    await settle(fixture);

    expect(fixture.componentInstance.model().body).toBe('um texto![Enviando foto.png (1)…]()');
    http
      .expectOne({ method: 'POST', url: `${API}/admin/media` })
      .flush(
        { data: { markdown: '![foto](http://api.test/storage/media/foto.png)' } },
        { status: 201, statusText: 'Created' },
      );
    await settle(fixture);

    expect(fixture.componentInstance.model().body).toBe(
      'um texto![foto](http://api.test/storage/media/foto.png)',
    );
    await flushPreview(fixture, http);
  });

  it('refuses invalid files without sending them', async () => {
    const { fixture, http, element } = await render();

    const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', {
      value: [new File(['x'], 'doc.pdf', { type: 'application/pdf' })],
      configurable: true,
    });
    input.dispatchEvent(new Event('change'));
    await settle(fixture);

    http.expectNone({ method: 'POST', url: `${API}/admin/media` });
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('doc.pdf');
    expect(fixture.componentInstance.model().body).toBe('um texto');
  });

  it('highlights a required empty editor as invalid only after it was touched', async () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: API },
      ],
    });
    const fixture = TestBed.createComponent(RequiredHost);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .match(PREVIEW_URL)
      .forEach((request) => request.flush({ html: '' }));

    expect(element.querySelector('.editor--invalid')).toBeNull();

    element.querySelector('textarea')!.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(element.querySelector('.editor--invalid')).not.toBeNull();
    expect(element.querySelector('textarea')?.getAttribute('aria-invalid')).toBe('true');
  });
});
