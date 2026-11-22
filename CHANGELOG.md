## v0.6.0 (2026-11-22)

### Feat

- **blog**: inclui títulos ### e #### no sumário do post

## v0.5.0 (2026-11-22)

### Feat

- **media**: aceita imagens SVG no upload
- **blog**: notifica o envio de comentários com toast
- **admin**: avisa falhas de login com toast
- **admin**: notifica as ações do painel com toasts
- **toast**: adiciona notificações em toast no canto superior direito

## v0.4.0 (2026-11-22)

### Feat

- **admin**: adiciona seletor de data e hora no visual do site
- **blog**: exibe as datas no formato dd/mm/aaaa

### Fix

- **blog**: evita que o sumário pare de acompanhar a rolagem
- impede que .visually-hidden seja sobrescrita por estilos de campos

## v0.3.0 (2026-11-22)

### Feat

- **blog**: adiciona sumário das seções nos posts
- **blog**: adiciona esqueleto de carregamento nas listas de posts
- **layout**: adiciona espera e deslize às dicas do menu
- **layout**: adiciona transição animada entre páginas
- **layout**: adiciona menu lateral recolhível ao blog e ao admin
- **admin**: permite reordenar as páginas
- **layout**: substitui a barra superior por menu lateral
- **blog**: integra a busca na página inicial

### Fix

- **blog**: alinha os comentários ao texto nos posts com sumário

## v0.2.0 (2026-11-21)

### Feat

- **blog**: adiciona índices de categorias e tags e menu com as páginas
- **admin**: adiciona seletor de ícone obrigatório nas páginas

## v0.1.3 (2026-11-21)

### Fix

- **blog**: alinha ícones da navegação, meta dos posts e listas de tarefas
- **admin**: mantém a barra em uma linha e solta no celular
- **ui**: padroniza avisos, filtros, badges e cabeçalhos entre as telas

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
