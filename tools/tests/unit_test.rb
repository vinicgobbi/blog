# frozen_string_literal: true

require_relative "test_helper"

class SlugTest < Minitest::Test
  def test_removes_accents_and_symbols
    assert_equal "acao-reacao-no-linux", BlogTools::Slug.from("Ação & Reação no Linux!")
    assert_equal Encoding::UTF_8, BlogTools::Slug.from("Olá").encoding
    assert_equal "c-e-melhor", BlogTools::Slug.from("  C++ é melhor?  ")
    assert_equal "", BlogTools::Slug.from("!!!")
  end

  def test_valid
    assert BlogTools::Slug.valid?("apps-2024")
    refute BlogTools::Slug.valid?("Apps")
    refute BlogTools::Slug.valid?("a--b")
    refute BlogTools::Slug.valid?("")
  end
end

class DatesTest < Minitest::Test
  def test_parses_front_matter_formats
    assert_equal Time.local(2025, 2, 13, 22, 0), BlogTools::Dates.parse("2025-02-13 22:00")
    assert_equal Time.local(2025, 2, 13), BlogTools::Dates.parse("2025-02-13")
    assert_equal Time.new(2025, 2, 13, 22, 0, 5, "+00:00"), BlogTools::Dates.parse("2025-02-13 22:00:05 +0000")
    assert_equal Time.local(2025, 2, 13), BlogTools::Dates.parse(Date.new(2025, 2, 13))
  end

  def test_rejects_invalid
    assert_nil BlogTools::Dates.parse("2025-02-30 10:00")
    assert_nil BlogTools::Dates.parse("ontem")
    assert_nil BlogTools::Dates.parse(nil)
  end
end

class YamlValueTest < Minitest::Test
  def test_quote_round_trips
    ['Título "com aspas"', 'barra \\ invertida', "dois: pontos", "linha\nnova"].each do |text|
      assert_equal text, YAML.safe_load("t: #{BlogTools::YamlValue.quote(text)}")["t"]
    end
  end

  def test_list_quotes_only_when_needed
    assert_equal "[linux, sistemas operacionais]", BlogTools::YamlValue.list(["linux", "sistemas operacionais"])
    list = BlogTools::YamlValue.list(["2024", "yes", "a, b", "c#"])
    assert_equal %w[2024 yes] + ["a, b", "c#"], YAML.safe_load("l: #{list}")["l"]
  end
end

class FrontMatterTest < Minitest::Test
  TEXT = <<~MD
    ---
    title: "Olá"
    date: 2025-01-01 10:00
    # comentário
    tags:
      - a
      - b
    categories: [x]
    ---
    Corpo
    ---
    com separador
  MD

  def parse(text = TEXT) = BlogTools::FrontMatter.parse(text)

  def test_reads_values_and_body
    fm = parse
    assert_equal "Olá", fm["title"]
    assert_equal %w[a b], fm["tags"]
    assert_equal "Corpo\n---\ncom separador\n", fm.body
  end

  def test_set_replaces_block_value_and_keeps_the_rest
    out = parse.set("tags", "[c]").to_s
    assert_includes out, "tags: [c]\ncategories: [x]"
    assert_includes out, "# comentário"
    refute_includes out, "  - a"
  end

  def test_set_inserts_after_anchor
    out = parse.set("last_modified_at", "2025-02-01 10:00", after: %w[missing date]).to_s
    assert_includes out, "date: 2025-01-01 10:00\nlast_modified_at: 2025-02-01 10:00\n"
  end

  def test_untouched_document_round_trips
    assert_equal TEXT, parse.to_s
  end

  def test_preserves_crlf
    crlf = TEXT.gsub("\n", "\r\n")
    out = parse(crlf).set("title", '"Novo"').to_s
    assert_includes out, "title: \"Novo\"\r\ndate:"
    assert_equal "Novo", parse(out)["title"]
  end

  def test_delete
    refute parse.delete("date").key?("date")
  end

  def test_errors
    assert_raises(BlogTools::Error) { parse("sem front matter") }
    assert_raises(BlogTools::Error) { parse("---\ntitle: [aberto\n---\n") }
    assert_raises(BlogTools::Error) { parse.set("title", "[quebrado") }
  end
end

class GitStatusTest < Minitest::Test
  def test_parses_renames_and_untracked
    out = "R  _posts/novo.md\0_drafts/novo.md\0 M _posts/a.md\0?? _posts/b c.md\0MM _posts/d.md\0"
    entries = BlogTools::Git.parse_status(out)

    assert_equal ["_posts/novo.md", "_posts/a.md", "_posts/b c.md", "_posts/d.md"], entries.map(&:path)
    assert_equal "_drafts/novo.md", entries[0].orig_path
    assert entries[0].renamed?
    assert entries[2].untracked?
    assert entries[3].staged? && entries[3].unstaged?
    refute entries[1].staged?
  end
end
