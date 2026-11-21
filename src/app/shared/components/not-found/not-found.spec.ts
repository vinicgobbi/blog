import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { NotFound } from './not-found';

function render(inputs: Record<string, string | undefined> = {}) {
  const response: ResponseInit = {};
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: RESPONSE_INIT, useValue: response }],
  });
  const fixture = TestBed.createComponent(NotFound);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();

  return { response, element: fixture.nativeElement as HTMLElement };
}

describe('NotFound', () => {
  it('answers 404 during server rendering and asks search engines not to index', () => {
    const { response } = render();

    expect(response.status).toBe(404);
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe('noindex, follow');
  });

  it('shows the given title and message', () => {
    const { element } = render({ title: 'Tag não encontrada', message: 'Não existe essa tag.' });

    expect(element.querySelector('h1')?.textContent).toBe('Tag não encontrada');
    expect(element.textContent).toContain('Não existe essa tag.');
    expect(TestBed.inject(Title).getTitle()).toContain('Tag não encontrada');
  });

  it('keeps the default texts when the router binds undefined inputs (wildcard route)', () => {
    const { element } = render({ title: undefined, message: undefined });

    expect(element.querySelector('h1')?.textContent).toBe('Página não encontrada');
    expect(element.textContent).toContain(
      'O endereço que você acessou não existe ou foi removido.',
    );
  });
});
