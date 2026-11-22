import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SearchForm } from './search-form';

async function render(q?: string) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(SearchForm);
  if (q !== undefined) {
    fixture.componentRef.setInput('q', q);
  }
  await fixture.whenStable();

  return { fixture, router, element: fixture.nativeElement as HTMLElement };
}

function typeTerm(element: HTMLElement, value: string): void {
  const input = element.querySelector<HTMLInputElement>('#busca-termo')!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function submit(element: HTMLElement): void {
  element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
}

describe('SearchForm', () => {
  it('fills the field with the current term', async () => {
    const { element } = await render('angular');

    expect(element.querySelector<HTMLInputElement>('#busca-termo')?.value).toBe('angular');
  });

  it('navigates to the home page with the trimmed term on submit', async () => {
    const { fixture, router, element } = await render();
    typeTerm(element, '  laravel  ');
    await fixture.whenStable();

    submit(element);

    expect(router.navigate).toHaveBeenCalledWith(['/'], { queryParams: { q: 'laravel' } });
  });

  it('clears the search when submitted empty', async () => {
    const { fixture, router, element } = await render('laravel');
    typeTerm(element, '   ');
    await fixture.whenStable();

    submit(element);

    expect(router.navigate).toHaveBeenCalledWith(['/'], { queryParams: { q: null } });
  });

  it('blocks terms longer than the API limit', async () => {
    const { fixture, router, element } = await render();
    typeTerm(element, 'a'.repeat(101));
    await fixture.whenStable();

    submit(element);
    fixture.detectChanges();

    expect(router.navigate).not.toHaveBeenCalled();
    expect(element.querySelector('#busca-erro')?.textContent).toContain('no máximo 100 caracteres');
  });
});
