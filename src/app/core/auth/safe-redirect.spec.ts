import { safeAdminRedirect } from './safe-redirect';

describe('safeAdminRedirect', () => {
  it('keeps internal admin paths, including query string', () => {
    expect(safeAdminRedirect('/admin')).toBe('/admin');
    expect(safeAdminRedirect('/admin/posts?state=draft')).toBe('/admin/posts?state=draft');
  });

  it('falls back to the dashboard when there is no redirect', () => {
    expect(safeAdminRedirect(undefined)).toBe('/admin');
    expect(safeAdminRedirect('')).toBe('/admin');
  });

  it.each([
    'https://site-malicioso.example',
    '//site-malicioso.example',
    '/\\site-malicioso.example',
    '/administrador-falso',
    '/posts/qualquer',
    'javascript:alert(1)',
  ])('rejects %s to prevent open redirect', (value) => {
    expect(safeAdminRedirect(value)).toBe('/admin');
  });

  it('does not redirect back to the login page', () => {
    expect(safeAdminRedirect('/admin/login')).toBe('/admin');
    expect(safeAdminRedirect('/admin/login?redirect=/admin')).toBe('/admin');
  });
});
