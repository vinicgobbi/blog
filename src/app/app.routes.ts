import { Routes } from '@angular/router';

/**
 * A rota `:slug` (páginas estáticas, ex.: /sobre) fica por último entre as
 * rotas com parâmetro, para não capturar caminhos das demais.
 */
export const routes: Routes = [
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
    loadComponent: () => import('./shared/components/not-found/not-found').then((m) => m.NotFound),
  },
];
