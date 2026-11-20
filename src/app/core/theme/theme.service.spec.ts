import { DOCUMENT, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

function setup(platform: 'browser' | 'server' = 'browser') {
  TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });

  return { theme: TestBed.inject(ThemeService), root: TestBed.inject(DOCUMENT).documentElement };
}

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.setAttribute('data-theme', 'dark');
  });

  it('switches from dark to light, updating the html attribute and saving the choice', () => {
    const { theme, root } = setup();

    theme.toggle();

    expect(theme.theme()).toBe('light');
    expect(root.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('switches back to dark on a second toggle', () => {
    const { theme, root } = setup();

    theme.toggle();
    theme.toggle();

    expect(theme.theme()).toBe('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('does not touch browser storage during server rendering', () => {
    const { theme } = setup('server');

    theme.toggle();

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});
