## v0.1.2 (2026-11-21)

### Fix

- **ssr**: inicia o servidor quando executado por link simbólico

## v0.1.1 (2026-11-21)

### Fix

- **ssr**: libera o domínio de produção nos allowedHosts

## v0.1.0 (2026-11-21)

### Feat

- **layout**: exibe as versões do front e da API no rodapé
- **admin**: mostra a quantidade de comentários pendentes no menu
- **admin**: adiciona tela de moderação de comentários
- **admin**: adiciona moderação de comentários à AdminApi
- **admin**: adiciona telas de categorias, tags e páginas
- **admin**: adiciona categorias, tags e páginas à AdminApi
- **editor**: envia imagens pelo editor e escolhe a capa na biblioteca
- **media**: adiciona biblioteca e página de mídia
- **media**: adiciona endpoints e validação de upload de imagens
- **admin**: adiciona lista e edição de posts
- **editor**: adiciona editor de markdown com toolbar e pré-visualização
- **admin**: adiciona tipos, endpoints e conversão de datas dos posts
- **admin**: adiciona login, layout e dashboard da área administrativa
- **auth**: adiciona guard de visitante e validação do redirecionamento pós-login
- **blog**: adiciona listagens por tag e categoria, busca e páginas estáticas
- **seo**: anuncia o feed rss no head e permite marcar páginas como noindex
- **comments**: adiciona comentários na página do post
- **blog**: adiciona página do post com seo e open graph
- **ui**: aplica a identidade visual do portfólio ao blog
- **blog**: adiciona página inicial com listagem paginada de posts
- **layout**: adiciona layout público com estilos globais acessíveis
- **ui**: adiciona componentes de card de post e paginação
- **blog**: adiciona tipos e serviço de leitura dos posts da api
- **core**: configura locale pt-br, fuso de datas e binding de inputs pela rota
- **seo**: adiciona serviço de title, meta tags e open graph
- **auth**: adiciona sessão do admin com interceptor e guard
- **core**: adiciona tipos da api e configuração de ambiente do site
- **ssr**: configura renderização no servidor e ambientes da api

### Fix

- **nav**: só rola até o fragmento ao abrir a página, sem mover o foco
- **nav**: mantém links de âncora na página atual
- **ssr**: reaproveita no navegador as respostas da api buscadas no ssr

### Refactor

- **ssr**: usa o cache de transferência padrão do Angular
- **admin**: extrai estilos de listagem para um SCSS compartilhado
- **ui**: move estilos de campos de formulário e cores de erro para o css global
- **layout**: transforma o layout público em componente de rota
- **blog**: extrai a listagem de posts e o estado não encontrado em componentes
- **blog**: só lê o valor da listagem quando o recurso tem valor
