# frozen_string_literal: true

require "minitest/autorun"
require "stringio"
require "tmpdir"
require_relative "../lib/blog_tools"

ENV["TZ"] = "America/Sao_Paulo"

# Site temporário (com repositório git) para testar os comandos de ponta a ponta.
class SiteTestCase < Minitest::Test
  NOW = Time.local(2026, 10, 18, 15, 30)

  def setup
    @root = Dir.mktmpdir("blog-tools-test")
    write "_config.yml", "timezone: America/Sao_Paulo\n"
    write "_data/authors.yml", "vinicius:\n  name: Vinícius\n"
    FileUtils.mkdir_p(path("_posts"))
    FileUtils.mkdir_p(path("assets/img/posts"))
    git "init", "-q"
    git "config", "user.email", "test@example.com"
    git "config", "user.name", "Test"
    git "config", "commit.gpgsign", "false"
  end

  def teardown
    FileUtils.rm_rf(@root)
  end

  def path(rel) = File.join(@root, rel)
  def read(rel) = File.read(path(rel))
  def site = BlogTools::Site.new(@root)

  def write(rel, content)
    FileUtils.mkdir_p(File.dirname(path(rel)))
    File.write(path(rel), content)
  end

  def git(*args)
    out, err, status = Open3.capture3("git", "-C", @root, *args)
    raise "git #{args.join(" ")}: #{err}" unless status.success?

    out
  end

  def commit_all(message = "commit")
    git "add", "-A"
    git "commit", "-q", "-m", message
  end

  def post(rel, title: "Post", date: "2025-01-01 10:00", body: "Texto.\n", extra: "")
    write rel, <<~MD
      ---
      title: "#{title}"
      #{"date: #{date}\n" if date}author: vinicius
      tags: [linux]
      categories: [pessoal]
      #{extra}---

      #{body}
    MD
  end

  # Roda o CLI e devolve [status, stdout, stderr].
  def cli(*argv, now: NOW)
    out = StringIO.new
    err = StringIO.new
    status = BlogTools::CLI.new(root: @root, out: out, err: err, clock: -> { now }).run(argv)
    [status, out.string, err.string]
  end

  def cli!(*argv, **opts)
    status, out, err = cli(*argv, **opts)
    assert_equal 0, status, "falhou: #{argv.join(" ")}\n#{out}#{err}"
    out
  end
end
