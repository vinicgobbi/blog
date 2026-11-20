import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Pagination, pageWindow } from './pagination';

describe('pageWindow', () => {
  it('lists every page when there are at most 7', () => {
    expect(pageWindow(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('keeps first, last and neighbours of the current page, with gaps between', () => {
    expect(pageWindow(5, 10)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10]);
  });

  it('does not add a gap next to the first or last page', () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, 'gap', 10]);
    expect(pageWindow(2, 10)).toEqual([1, 2, 3, 'gap', 10]);
    expect(pageWindow(10, 10)).toEqual([1, 'gap', 9, 10]);
  });
});

describe('Pagination', () => {
  function render(currentPage: number, lastPage: number): HTMLElement {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Pagination);
    fixture.componentRef.setInput('currentPage', currentPage);
    fixture.componentRef.setInput('lastPage', lastPage);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  it('renders nothing when there is a single page', () => {
    expect(render(1, 1).querySelector('nav')).toBeNull();
  });

  it('marks the current page and links neighbours with page query param', () => {
    const element = render(2, 3);

    const current = element.querySelector('a[aria-current="page"]');
    expect(current?.textContent?.trim()).toBe('2');
    expect(element.querySelector('a[rel="next"]')?.getAttribute('href')).toBe('/?page=3');
  });

  it('links back to page 1 without the page query param', () => {
    const element = render(2, 3);

    expect(element.querySelector('a[rel="prev"]')?.getAttribute('href')).toBe('/');
  });

  it('disables previous on the first page and next on the last page', () => {
    expect(render(1, 3).querySelector('a[rel="prev"]')).toBeNull();
    TestBed.resetTestingModule();
    expect(render(3, 3).querySelector('a[rel="next"]')).toBeNull();
  });
});
