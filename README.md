# Blog (front-end)

Front-end do blog em Angular, com renderização no servidor (SSR). Consome a [blog-api](https://github.com/vinicgobbi/blog-api).

## Tecnologias

- **Angular** 22, com SSR via `@angular/ssr` e servidor Express
- **pnpm** como gerenciador de pacotes
- **Vitest** para testes unitários
- **[@vinicgobbi/ui](https://github.com/vinicgobbi/vinicgobbi-ui)**: minha identidade visual (tokens, tema claro/escuro, fontes, menu lateral e dicas), compartilhada com o portfólio e a página de links

## Renderização

| Rotas | Modo | Motivo |
|---|---|---|
| Públicas (home, posts, tags…) | `Server`: renderizadas no servidor a cada requisição | SEO e preview de links em redes sociais |
| `/admin/**` | `Client`: renderizadas só no navegador | Dependem do token salvo no navegador e não precisam de SEO |

A configuração fica em `src/app/app.routes.server.ts`.

## Ambientes

As URLs da API ficam em `src/environments/`:

- `environment.development.ts`: usado no `pnpm start`, aponta para a API local (`http://localhost:8000`);
- `environment.ts`: usado no build de produção. Ajuste para o domínio real da API.

## Desenvolvimento

O `@vinicgobbi/ui` vem do GitHub Packages, que exige token até para pacotes públicos. O pnpm 12 não lê credenciais do `.npmrc` do repositório, então o token fica na configuração do usuário. Uma vez só, no `~/.npmrc`:

```ini
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

E, antes do `pnpm install`, um token com o escopo `read:packages` (o do `gh` serve, depois de `gh auth refresh -s read:packages`):

```sh
export NODE_AUTH_TOKEN=$(gh auth token)
```

```sh
pnpm install
pnpm start
```

A aplicação fica disponível em `http://localhost:4200`, já com SSR. Para ver os dados, a API precisa estar rodando (`composer dev` no projeto blog-api).

## Build e execução em produção

```sh
pnpm build
NG_ALLOWED_HOSTS=seudominio.com.br PORT=4000 pnpm serve:ssr:blog_novo
```

> **`NG_ALLOWED_HOSTS` é obrigatório.** Por segurança (proteção contra SSRF), o servidor SSR recusa com 400 qualquer requisição cujo header `Host` não esteja na lista, inclusive `localhost`. Use vírgulas para informar mais de um host. Para testar o build localmente, use `NG_ALLOWED_HOSTS=localhost`.

## Testes

```sh
pnpm test
```

## Commits e versionamento

Os commits seguem o [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/). A configuração do [Commitizen](https://commitizen-tools.github.io/commitizen/) fica no `.cz.toml`:

```sh
pipx install commitizen   # uma vez
cz commit                 # monta a mensagem do commit
cz bump                   # nova versão: atualiza o package.json e src/app/core/version.ts, gera o CHANGELOG.md e cria a tag vX.Y.Z
```

O rodapé do blog mostra a versão do front e a da API (lida de `GET /api`).

## Roadmap

O desenvolvimento é organizado por [issues e marcos](https://github.com/vinicgobbi/blog-front/milestones):

- **M1 – Fundação:** SSR, ambientes, autenticação e SEO
- **M2 – Blog público:** home, página do post, comentários, tags, categorias e RSS
- **M3 – Administração:** editor de Markdown, mídia, CRUDs e moderação
