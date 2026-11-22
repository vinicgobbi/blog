import { TestBed } from '@angular/core/testing';
import { Navigation, Router, ViewTransitionInfo, provideRouter } from '@angular/router';
import { NAV_DIRECTION_ATTRIBUTE, onViewTransitionCreated } from './view-transitions';

function startTransition(trigger: Navigation['trigger'] | null) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'currentNavigation').mockReturnValue(
    trigger ? ({ trigger } as Navigation) : null,
  );
  let finish!: () => void;
  const finished = new Promise<void>((resolve) => (finish = resolve));
  const info = { transition: { finished } } as unknown as ViewTransitionInfo;

  TestBed.runInInjectionContext(() => onViewTransitionCreated(info));

  return { finish, finished };
}

function direction(): string | null {
  return document.documentElement.getAttribute(NAV_DIRECTION_ATTRIBUTE);
}

describe('onViewTransitionCreated', () => {
  afterEach(() => document.documentElement.removeAttribute(NAV_DIRECTION_ATTRIBUTE));

  it('marks links as forward navigation and clears it when the transition ends', async () => {
    const { finish, finished } = startTransition('imperative');

    expect(direction()).toBe('forward');

    finish();
    await finished;
    await Promise.resolve();

    expect(direction()).toBeNull();
  });

  it('marks browser back and forward as back navigation', () => {
    startTransition('popstate');

    expect(direction()).toBe('back');
  });

  it('treats a transition without a current navigation as forward', () => {
    startTransition(null);

    expect(direction()).toBe('forward');
  });
});
