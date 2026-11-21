import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { guestGuard } from './core/auth/guest.guard';

/**
 * Duas cascas: a área admin (renderizada só no navegador, ver app.routes.server.ts)
 * e o blog público. Entre as rotas públicas, `:slug` (páginas estáticas, ex.:
 * /sobre) fica por último entre as com parâmetro, para não capturar as demais.
 */
export const routes: Routes = [
  {
    path: 'admin/login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/admin/login/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./features/admin/layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./shared/components/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layout/public-layout/public-layout').then((m) => m.PublicLayout),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/blog/home/home-page').then((m) => m.HomePage),
      },
      {
        path: 'posts/:slug',
        loadComponent: () => import('./features/blog/post/post-page').then((m) => m.PostPage),
      },
      {
        path: 'tags/:slug',
        loadComponent: () => import('./features/blog/tag/tag-page').then((m) => m.TagPage),
      },
      {
        path: 'categorias/:slug',
        loadComponent: () =>
          import('./features/blog/category/category-page').then((m) => m.CategoryPage),
      },
      {
        path: 'busca',
        loadComponent: () => import('./features/blog/search/search-page').then((m) => m.SearchPage),
      },
      {
        path: ':slug',
        loadComponent: () =>
          import('./features/blog/static-page/static-page').then((m) => m.StaticPageComponent),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./shared/components/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
