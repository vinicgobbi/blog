# frozen_string_literal: true

require_relative "test_helper"

class NewCommandTest < SiteTestCase
  def test_creates_post_and_image_dir
    cli! "new", 'Olá "Mundo" \\ Linux', "-t", "linux, dicas", "-c", "tecnologia"
    rel = "_posts/2026-10-18-ola-mundo-linux.md"
    fm = BlogTools::FrontMatter.parse(read(rel))

    assert_equal 'Olá "Mundo" \\ Linux', fm["title"]
    assert_equal "2026-10-18 15:30", fm["date"]
    assert_equal "vinicius", fm["author"]
    assert_equal %w[linux dicas], fm["tags"]
    assert Dir.exist?(path("assets/img/posts/2026-10-18-ola-mundo-linux"))
  end

  def test_draft_has_no_date
    cli! "new", "Rascunho", "--draft", "--no-images"
    refute BlogTools::FrontMatter.parse(read("_drafts/rascunho.md")).key?("date")
    refute Dir.exist?(path("assets/img/posts/rascunho"))
  end

  def test_rejects_duplicate_slug_and_unknown_author
    post "_posts/2020-01-01-repetido.md"
    status, _, err = cli("new", "Repetido")
    assert_equal 1, status
    assert_match(/slug 'repetido'/, err)

    status, _, err = cli("new", "Outro", "-a", "fulano")
    assert_equal 1, status
    assert_match(/autor 'fulano'/, err)
  end
end

class PublishCommandTest < SiteTestCase
  def test_moves_draft_images_and_references
    post "_drafts/meu-post.md", date: nil, extra: "last_modified_at: 2026-01-01 10:00\n",
                                body: "![a](/assets/img/posts/meu-post/a.png)\n"
    write "assets/img/posts/meu-post/a.png", "png"
    commit_all

    cli! "publish", "meu-post", "--date", "2026-10-10 08:00"
    rel = "_posts/2026-10-10-meu-post.md"
    fm = BlogTools::FrontMatter.parse(read(rel))

    refute File.exist?(path("_drafts/meu-post.md"))
    assert_equal "2026-10-10 08:00", fm["date"]
    refute fm.key?("last_modified_at")
    assert_includes fm.body, "/assets/img/posts/2026-10-10-meu-post/a.png"
    assert File.file?(path("assets/img/posts/2026-10-10-meu-post/a.png"))
    assert_match(%r{^R. _drafts/meu-post.md -> _posts/2026-10-10-meu-post.md}, git("status", "--short"))
    cli! "check"
  end

  def test_refuses_published_post
    post "_posts/2025-01-01-ja.md"
    status, _, err = cli("publish", "ja")
    assert_equal 1, status
    assert_match(/já está publicado/, err)
  end
end

class RenameCommandTest < SiteTestCase
  def setup
    super
    post "_posts/2025-01-01-antigo.md", title: "Antigo", body: "![x](/assets/img/posts/2025-01-01-antigo/x.png)\n"
    write "assets/img/posts/2025-01-01-antigo/x.png", "png"
    post "_posts/2025-02-01-outro.md", body: "Veja [o antigo]({% post_url 2025-01-01-antigo %}) e /posts/antigo/.\n"
    commit_all
  end

  def test_title_only_keeps_url
    cli! "rename", "antigo", "--title", "Título novo"
    assert_equal "Título novo", BlogTools::FrontMatter.parse(read("_posts/2025-01-01-antigo.md"))["title"]
  end

  def test_slug_change_requires_force
    status, _, err = cli("rename", "antigo", "--slug", "novo")
    assert_equal 1, status
    assert_match(/--force/, err)
    assert File.exist?(path("_posts/2025-01-01-antigo.md"))
  end

  def test_slug_change_updates_everything
    cli! "rename", "antigo", "--title", "Bem Novo", "--slug", "--force"

    assert File.exist?(path("_posts/2025-01-01-bem-novo.md"))
    assert File.file?(path("assets/img/posts/2025-01-01-bem-novo/x.png"))
    assert_includes read("_posts/2025-01-01-bem-novo.md"), "/assets/img/posts/2025-01-01-bem-novo/x.png"
    other = read("_posts/2025-02-01-outro.md")
    assert_includes other, "{% post_url 2025-01-01-bem-novo %}"
    assert_includes other, "/posts/bem-novo/"
    cli! "check"
  end
end

class CheckCommandTest < SiteTestCase
  def test_clean_site
    post "_posts/2025-01-01-ok.md", body: "![a](/assets/img/posts/2025-01-01-ok/a%20b.png)\n"
    write "assets/img/posts/2025-01-01-ok/a b.png", "png"
    out = cli! "check", "--strict"
    assert_match(/0 erro\(s\), 0 aviso\(s\)/, out)
  end

  def test_reports_problems
    post "_posts/2025-01-01-a.md", extra: "image: /assets/img/sem-capa.png\n",
                                   body: "![x](/assets/img/posts/2025-01-01-a/falta.png)\n{% post_url nao-existe %}\n" \
                                         "```\n![ignorada](/nao/conta.png)\n```\n"
    write "assets/img/posts/2025-01-01-a/sobra.png", "png"
    post "_posts/2025-03-01-a.md", date: "2025-03-02 10:00"
    write "_posts/2025-03-01-a.md", read("_posts/2025-03-01-a.md").sub("tags: [linux]", "tags: [Linux]")
    write "_posts/2025-04-01-quebrado.md", "---\ntitle: [x\n---\n"
    write "assets/img/posts/orfa/img.png", "png"

    status, out, = cli("check")
    assert_equal 1, status
    [
      "imagem não encontrada: /assets/img/posts/2025-01-01-a/falta.png",
      "imagem não encontrada: /assets/img/sem-capa.png",
      "post_url aponta para um post que não existe: nao-existe",
      "imagem não usada: assets/img/posts/2025-01-01-a/sobra.png",
      "URL /posts/a/ duplicada",
      "difere da data do nome do arquivo",
      "YAML inválido",
      "tags parecidas: 'linux'",
      "pasta de imagens sem post correspondente"
    ].each { |msg| assert_includes out, msg }
    refute_includes out, "/nao/conta.png"
  end
end

class LastmodCommandTest < SiteTestCase
  def setup
    super
    post "_posts/2025-01-01-velho.md"
    post "_posts/2025-01-02-intacto.md"
    commit_all
  end

  def lastmod(rel) = BlogTools::FrontMatter.parse(read(rel))["last_modified_at"]

  def test_stamps_only_edited_published_posts
    File.write(path("_posts/2025-01-01-velho.md"), read("_posts/2025-01-01-velho.md") + "Mais.\n")
    post "_posts/2026-10-18-novo.md"

    cli! "lastmod"
    assert_equal "2026-10-18 15:30", lastmod("_posts/2025-01-01-velho.md")
    assert_includes read("_posts/2025-01-01-velho.md"), "date: 2025-01-01 10:00\nlast_modified_at: 2026-10-18 15:30\n"
    assert_nil lastmod("_posts/2025-01-02-intacto.md")
    assert_nil lastmod("_posts/2026-10-18-novo.md")
  end

  def test_staged_mode_skips_partially_staged_and_restages
    rel = "_posts/2025-01-01-velho.md"
    File.write(path(rel), read(rel) + "Mais.\n")
    git "add", rel
    cli! "lastmod", "--staged"
    assert_equal "", git("diff", "--", rel), "a edição do lastmod deveria estar no índice"

    File.write(path(rel), read(rel) + "Fora do índice.\n")
    _, _, err = cli("lastmod", "--staged", now: NOW + 3600)
    assert_match(/pulado/, err)
    assert_equal "2026-10-18 15:30", lastmod(rel)
  end

  def test_explicit_post_and_dry_run
    cli! "lastmod", "intacto", "--dry-run"
    assert_nil lastmod("_posts/2025-01-02-intacto.md")
    cli! "lastmod", "intacto"
    assert_equal "2026-10-18 15:30", lastmod("_posts/2025-01-02-intacto.md")
  end
end

class HooksCommandTest < SiteTestCase
  def test_install_and_uninstall
    write "tools/hooks/pre-commit", "#!/bin/sh\n"
    cli! "hooks", "install"
    assert_equal "tools/hooks\n", git("config", "--get", "core.hooksPath")
    assert File.executable?(path("tools/hooks/pre-commit"))
    cli! "hooks", "uninstall"
    assert_raises(RuntimeError) { git("config", "--get", "core.hooksPath") }
  end
end
