/**
 * Configuração de desenvolvimento (`ng serve`), apontando para a API local
 * iniciada com `composer dev` no projeto blog-api.
 */
export const environment = {
  siteName: 'Blog do Vinícius',
  siteDescription:
    'Artigos sobre desenvolvimento web, Laravel, Angular e o que mais eu estiver aprendendo.',
  portfolioUrl: 'https://vinicgobbi.dev.br',
  siteUrl: 'http://localhost:4200',
  apiUrl: 'http://localhost:8000/api',
  feedUrl: 'http://localhost:8000/feed',
};
