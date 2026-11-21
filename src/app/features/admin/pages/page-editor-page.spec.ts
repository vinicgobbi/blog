import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, input, model, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormValueControl } from '@angular/forms/signals';
import { Router, provideRouter } from '@angular/router';
import { API_URL } from '../../../core/api';
import { AdminPage } from '../../../shared/models/admin';
import { MarkdownEditor } from '../editor/markdown-editor';
import { PageEditorPage, toPageFormModel, toPageInput } from './page-editor-page';

/** Substitui o editor de Markdown (que tem testes próprios) por um textarea simples. */
@Component({
  selector: 'app-markdown-editor',
  template: `<textarea
    [id]="inputId()"
    [value]="value()"
    (input)="value.set($any($event.target).value)"
    (blur)="touch.emit()"
  ></textarea>`,
})
class MarkdownEditorStub implements FormValueControl<string> {
  readonly value = model('');
  readonly touch = output<void>();
  readonly inputId = input('');
  readonly describedBy = input<string | null>(null);
}

const API = 'http://api.test/api';

const PAGE: AdminPage = {
  id: 4,
  title: 'Sobre',
  slug: 'sobre',
  body_markdown: '# Olá',
  body_html: '<h1>Olá</h1>',
  is_published: false,
  created_at: '2026-11-20T10:00:00-03:00',
  updated_at: '2026-11-20T10:00:00-03:00',
};

function render(id?: number) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
    ],
  });
  TestBed.overrideComponent(PageEditorPage, {
    remove: { imports: [MarkdownEditor] },
    add: { imports: [MarkdownEditorStub] },
  });
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(PageEditorPage);
  if (id) {
    fixture.componentRef.setInput('id', String(id));
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
  const field = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
  field.value = value;
  field.dispatchEvent(new Event('input'));
}

async function save(fixture: ComponentFixture<PageEditorPage>, element: HTMLElement) {
  element.querySelector<HTMLButtonElement>('.post-form__actions button[type="submit"]')!.click();
  await fixture.whenStable();
}

describe('page form conversions', () => {
  it('maps an API page to form values and back', () => {
    const model = toPageFormModel(PAGE);

    expect(model).toEqual({
      title: 'Sobre',
      slug: 'sobre',
      body_markdown: '# Olá',
      is_published: false,
    });
    expect(toPageInput({ ...model, title: '  Sobre mim ', slug: ' ' })).toEqual({
      title: 'Sobre mim',
      slug: null,
      body_markdown: '# Olá',
      is_published: false,
    });
  });
});

describe('PageEditorPage', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('creates a published page and opens it for editing', async () => {
    const { fixture, router, http, element } = render();
    type(element, '#pagina-titulo', 'Contato');
    type(element, '#pagina-conteudo', 'Fale comigo');
    element.querySelector<HTMLInputElement>('#pagina-publicada')!.click();
    await fixture.whenStable();

    await save(fixture, element);
    const request = http.expectOne({ method: 'POST', url: `${API}/admin/pages` });
    expect(request.request.body).toEqual({
      title: 'Contato',
      slug: null,
      body_markdown: 'Fale comigo',
      is_published: true,
    });
    request.flush(
      { data: { ...PAGE, id: 9, title: 'Contato', slug: 'contato', is_published: true } },
      { status: 201, statusText: 'Created' },
    );

    await vi.waitFor(() =>
      expect(router.navigate).toHaveBeenCalledWith(['/admin/paginas', 9], {
        replaceUrl: true,
        state: { feedback: { kind: 'success', message: 'Página publicada.' } },
      }),
    );
  });

  it('does not save without title and content', async () => {
    const { fixture, http, element } = render();

    await save(fixture, element);
    fixture.detectChanges();

    http.expectNone({ method: 'POST', url: `${API}/admin/pages` });
    expect(element.querySelector('#pagina-titulo-erro')?.textContent).toContain(
      'Informe o título.',
    );
    expect(element.querySelector('#pagina-conteudo-erro')?.textContent).toContain(
      'Escreva o conteúdo da página.',
    );
  });

  it('loads an existing page and saves it with PUT', async () => {
    const { fixture, http, element } = render(4);
    http.expectOne(`${API}/admin/pages/4`).flush({ data: PAGE });
    await fixture.whenStable();

    expect(element.querySelector<HTMLInputElement>('#pagina-titulo')?.value).toBe('Sobre');
    expect(element.querySelector<HTMLInputElement>('#pagina-publicada')?.checked).toBe(false);
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);

    type(element, '#pagina-titulo', 'Sobre mim');
    await fixture.whenStable();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);

    await save(fixture, element);
    const request = http.expectOne({ method: 'PUT', url: `${API}/admin/pages/4` });
    expect(request.request.body).toMatchObject({ title: 'Sobre mim', is_published: false });
    request.flush({ data: { ...PAGE, title: 'Sobre mim' } });

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('[role="status"]')?.textContent).toContain('Rascunho salvo.');
    });
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('shows API validation errors next to the fields', async () => {
    const { fixture, http, element } = render();
    type(element, '#pagina-titulo', 'Sobre');
    type(element, '#pagina-conteudo', 'Texto');
    type(element, '#pagina-slug', 'sobre');
    await fixture.whenStable();

    await save(fixture, element);
    http
      .expectOne({ method: 'POST', url: `${API}/admin/pages` })
      .flush(
        { message: 'Dados inválidos', errors: { slug: ['Já existe uma página com este slug'] } },
        { status: 422, statusText: 'Unprocessable Content' },
      );

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('#pagina-slug-erro')?.textContent).toContain(
        'Já existe uma página com este slug',
      );
    });
  });
});
