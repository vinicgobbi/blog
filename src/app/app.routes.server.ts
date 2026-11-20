import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * A área administrativa depende do token salvo no navegador e não precisa
 * de SEO, então é renderizada apenas no cliente. As páginas públicas são
 * renderizadas no servidor a cada requisição, para que posts novos
 * apareçam imediatamente com as meta tags corretas.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'admin/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
