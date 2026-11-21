export const ADMIN_HOME = '/admin';

/**
 * Destino após o login, vindo do `?redirect=`. Só são aceitos caminhos internos
 * da área admin: qualquer outro valor (ex.: "https://site-malicioso",
 * "//site-malicioso" ou "/\\site-malicioso") vira o painel, evitando open
 * redirect. O próprio login também não é aceito como destino.
 */
export function safeAdminRedirect(value: string | null | undefined): string {
  if (!value || value.startsWith('//') || value.includes('\\')) {
    return ADMIN_HOME;
  }

  const path = value.split(/[?#]/, 1)[0];
  const isAdminPath = path === ADMIN_HOME || path.startsWith(`${ADMIN_HOME}/`);
  const isLogin = path === `${ADMIN_HOME}/login` || path.startsWith(`${ADMIN_HOME}/login/`);

  return isAdminPath && !isLogin ? value : ADMIN_HOME;
}
