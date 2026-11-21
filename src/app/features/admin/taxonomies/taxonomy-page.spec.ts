import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '../../../core/api';
import { Category, Tag } from '../../../shared/models/blog';
import { TaxonomyKind } from '../admin-api';
import { TaxonomyPage, toTaxonomyInput } from './taxonomy-page';

const API = 'http://api.test/api';

const CATEGORIES: Category[] = [
  { id: 1, name: 'Laravel', slug: 'laravel', description: 'Framework PHP', posts_count: 3 },
  { id: 2, name: 'Vazia', slug: 'vazia', description: null, posts_count: 0 },
];

const TAGS: Tag[] = [{ id: 5, name: 'PHP', slug: 'php', posts_count: 1 }];

async function render(kind: TaxonomyKind, items: (Category | Tag)[]) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
    ],
  });
  const fixture = TestBed.createComponent(TaxonomyPage);
  fixture.componentRef.setInput('kind', kind);
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne(`${API}/admin/${kind}`).flush({ data: items });
  await fixture.whenStable();

  return { fixture, http, element: fixture.nativeElement as HTMLElement };
}

function type(element: HTMLElement, selector: string, value: string): void {
  const field = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
  field.value = value;
  field.dispatchEvent(new Event('input'));
}

async function submit(fixture: ComponentFixture<TaxonomyPage>, element: HTMLElement) {
  element.querySelector<HTMLButtonElement>('.taxonomy__form button[type="submit"]')!.click();
  await fixture.whenStable();
}

describe('toTaxonomyInput', () => {
  it('trims values and sends description only for categories', () => {
    const model = { name: ' PHP ', slug: ' ', description: ' Sobre PHP ' };

    expect(toTaxonomyInput(model, 'categories')).toEqual({
      name: 'PHP',
      slug: null,
      description: 'Sobre PHP',
    });
    expect(toTaxonomyInput(model, 'tags')).toEqual({ name: 'PHP', slug: null });
  });
});

describe('TaxonomyPage', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
  });

  it('lists categories with post counts and public links', async () => {
    const { element } = await render('categories', CATEGORIES);

    expect(element.querySelector('h1')?.textContent).toContain('Categorias');
    const rows = element.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Laravel');
    expect(rows[0].textContent).toContain('3');
    expect(rows[0].querySelector('a[href="/categorias/laravel"]')).not.toBeNull();
    expect(element.querySelector('#taxonomia-descricao')).not.toBeNull();
  });

  it('hides the description field for tags and links to the tag page', async () => {
    const { element } = await render('tags', TAGS);

    expect(element.querySelector('h1')?.textContent).toContain('Tags');
    expect(element.querySelector('#taxonomia-descricao')).toBeNull();
    expect(element.querySelector('a[href="/tags/php"]')).not.toBeNull();
  });

  it('creates an item, clears the form and reloads the list', async () => {
    const { fixture, http, element } = await render('categories', CATEGORIES);
    type(element, '#taxonomia-nome', 'Angular');
    type(element, '#taxonomia-descricao', 'Front-end');
    await fixture.whenStable();

    await submit(fixture, element);
    const request = http.expectOne({ method: 'POST', url: `${API}/admin/categories` });
    expect(request.request.body).toEqual({ name: 'Angular', slug: null, description: 'Front-end' });
    request.flush(
      { data: { id: 3, name: 'Angular', slug: 'angular', description: 'Front-end' } },
      { status: 201, statusText: 'Created' },
    );

    const reload = await vi.waitFor(() => http.expectOne(`${API}/admin/categories`));
    reload.flush({ data: CATEGORIES });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('[role="status"]')?.textContent).toContain('Categoria criada.');
    expect(element.querySelector<HTMLInputElement>('#taxonomia-nome')?.value).toBe('');
  });

  it('edits an existing item with PUT', async () => {
    const { fixture, http, element } = await render('categories', CATEGORIES);

    element.querySelector<HTMLButtonElement>('button[aria-label="Editar Laravel"]')!.click();
    await fixture.whenStable();
    expect(element.querySelector<HTMLInputElement>('#taxonomia-nome')?.value).toBe('Laravel');
    expect(element.querySelector('#taxonomia-form-titulo')?.textContent).toContain(
      'Editar "Laravel"',
    );

    type(element, '#taxonomia-nome', 'Laravel 13');
    await fixture.whenStable();
    await submit(fixture, element);

    const request = http.expectOne({ method: 'PUT', url: `${API}/admin/categories/1` });
    expect(request.request.body).toEqual({
      name: 'Laravel 13',
      slug: 'laravel',
      description: 'Framework PHP',
    });
    request.flush({ data: { ...CATEGORIES[0], name: 'Laravel 13' } });

    (await vi.waitFor(() => http.expectOne(`${API}/admin/categories`))).flush({ data: [] });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Categoria atualizada.',
    );
  });

  it('does not submit without a name', async () => {
    const { fixture, http, element } = await render('tags', TAGS);

    await submit(fixture, element);
    fixture.detectChanges();

    http.expectNone({ method: 'POST', url: `${API}/admin/tags` });
    expect(element.querySelector('#taxonomia-nome-erro')?.textContent).toContain('Informe o nome.');
  });

  it('shows API validation errors next to the fields', async () => {
    const { fixture, http, element } = await render('tags', TAGS);
    type(element, '#taxonomia-nome', 'PHP');
    type(element, '#taxonomia-slug', 'php');
    await fixture.whenStable();

    await submit(fixture, element);
    http
      .expectOne({ method: 'POST', url: `${API}/admin/tags` })
      .flush(
        { message: 'Dados inválidos', errors: { slug: ['Já existe uma tag com este slug'] } },
        { status: 422, statusText: 'Unprocessable Content' },
      );

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('#taxonomia-slug-erro')?.textContent).toContain(
        'Já existe uma tag com este slug',
      );
    });
  });

  it('warns how many posts are affected before deleting a category', async () => {
    const { fixture, http, element } = await render('categories', CATEGORIES);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    element.querySelector<HTMLButtonElement>('button[aria-label="Excluir Laravel"]')!.click();

    expect(confirm).toHaveBeenCalledWith(
      'Excluir a categoria "Laravel"? 3 posts ficarão sem categoria.',
    );
    http
      .expectOne({ method: 'DELETE', url: `${API}/admin/categories/1` })
      .flush(null, { status: 204, statusText: 'No Content' });
    (await vi.waitFor(() => http.expectOne(`${API}/admin/categories`))).flush({ data: [] });
    await fixture.whenStable();
  });

  it('warns that a tag is removed from its posts', async () => {
    const { http, element } = await render('tags', TAGS);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    element.querySelector<HTMLButtonElement>('button[aria-label="Excluir PHP"]')!.click();

    expect(confirm).toHaveBeenCalledWith('Excluir a tag "PHP"? Ela será removida de 1 post.');
    http.expectNone({ method: 'DELETE', url: `${API}/admin/tags/5` });
  });

  it('shows an error when the deletion fails', async () => {
    const { fixture, http, element } = await render('categories', CATEGORIES);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    element.querySelector<HTMLButtonElement>('button[aria-label="Excluir Vazia"]')!.click();
    http
      .expectOne({ method: 'DELETE', url: `${API}/admin/categories/2` })
      .flush(null, { status: 500, statusText: 'Server Error' });

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('.notice')?.textContent).toContain(
        'Não foi possível excluir "Vazia".',
      );
    });
  });
});
