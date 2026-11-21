import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { HasUnsavedChanges, unsavedChangesGuard } from './unsaved-changes.guard';

function leave(component: HasUnsavedChanges): boolean {
  return TestBed.runInInjectionContext(
    () =>
      unsavedChangesGuard(
        component,
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
        {} as RouterStateSnapshot,
      ) as boolean,
  );
}

describe('unsavedChangesGuard', () => {
  afterEach(() => vi.restoreAllMocks());

  it('leaves without asking when everything is saved', () => {
    const confirm = vi.spyOn(window, 'confirm');

    expect(leave({ hasUnsavedChanges: () => false })).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks before leaving with unsaved changes and respects the answer', () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);

    expect(leave({ hasUnsavedChanges: () => true })).toBe(false);
    expect(leave({ hasUnsavedChanges: () => true })).toBe(true);
  });
});
