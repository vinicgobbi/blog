import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/blog/home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'posts/:slug',
    loadComponent: () => import('./features/blog/post/post-page').then((m) => m.PostPage),
  },
];
