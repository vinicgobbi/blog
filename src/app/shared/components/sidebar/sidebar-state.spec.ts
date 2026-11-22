import { Component, PLATFORM_ID, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { stubWideScreen } from '../../../../testing/wide-screen';
import { SidebarState, provideSidebar } from './sidebar-state';

@Component({ template: '', providers: [provideSidebar('blog')] })
class Host {
  readonly state = inject(SidebarState);
}

async function render(): Promise<SidebarState> {
  TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();

  return fixture.componentInstance.state;
}

describe('SidebarState', () => {
  let restoreScreen: () => void;

  beforeEach(() => (restoreScreen = stubWideScreen()));

  afterEach(() => {
    restoreScreen();
    localStorage.clear();
    document.documentElement.removeAttribute('data-sidebar-blog');
  });

  it('starts expanded, without tooltips', async () => {
    const state = await render();

    expect(state.collapsed()).toBe(false);
    expect(state.showTooltips()).toBe(false);
  });

  it('reads the collapsed state applied by the inline script of index.html', async () => {
    document.documentElement.setAttribute('data-sidebar-blog', 'collapsed');

    const state = await render();

    expect(state.collapsed()).toBe(true);
    expect(state.showTooltips()).toBe(true);
  });

  it('saves the collapsed state and applies it to the html element', async () => {
    const state = await render();

    state.toggleCollapsed();

    expect(state.collapsed()).toBe(true);
    expect(document.documentElement.getAttribute('data-sidebar-blog')).toBe('collapsed');
    expect(localStorage.getItem('sidebar.blog')).toBe('collapsed');

    state.toggleCollapsed();

    expect(document.documentElement.getAttribute('data-sidebar-blog')).toBe('expanded');
    expect(localStorage.getItem('sidebar.blog')).toBe('expanded');
  });

  it('shows no tooltips on narrow screens, where the drawer shows the labels', async () => {
    restoreScreen();
    restoreScreen = stubWideScreen(false);
    document.documentElement.setAttribute('data-sidebar-blog', 'collapsed');

    const state = await render();

    expect(state.collapsed()).toBe(true);
    expect(state.showTooltips()).toBe(false);
  });
});
