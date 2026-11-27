import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SeasonalGreeting } from '@vinicgobbi/ui/seasonal';
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

  describe('nas datas comemorativas', () => {
    function startHalloween(): ReturnType<typeof vi.fn> {
      const release = vi.fn();
      TestBed.inject(SeasonalGreeting).register('halloween', release);

      return release;
    }

    it('fora delas, mantém o placeholder e o botão de sempre', async () => {
      const { element } = await render();

      expect(element.querySelector('#busca-termo')?.getAttribute('placeholder')).toBe(
        'Buscar posts por título ou resumo…',
      );
      expect(element.querySelector('.search__seasonal')).toBeNull();
    });

    it('leva a saudação para o placeholder e o emoji da data para o botão', async () => {
      const { fixture, element } = await render();
      startHalloween();
      await fixture.whenStable();

      expect(element.querySelector('#busca-termo')?.getAttribute('placeholder')).toBe(
        'Feliz Halloween! Busque posts por título ou resumo…',
      );
      const button = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      expect(button.querySelector('.search__seasonal')?.textContent?.trim()).toBe('🎃');
      expect(button.textContent?.trim()).toContain('Buscar');
    });

    it('solta a revoada a partir do botão ao buscar', async () => {
      const { fixture, router, element } = await render();
      const release = startHalloween();
      await fixture.whenStable();
      const button = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(
        DOMRect.fromRect({ x: 100, y: 40, width: 80, height: 30 }),
      );
      typeTerm(element, 'angular');
      await fixture.whenStable();

      button.click();

      expect(release).toHaveBeenCalledWith({ x: 140, y: 55 });
      expect(router.navigate).toHaveBeenCalledWith(['/'], { queryParams: { q: 'angular' } });
    });
  });
});
