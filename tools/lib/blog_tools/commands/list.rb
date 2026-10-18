# frozen_string_literal: true

module BlogTools
  module Commands
    class List < Base
      describe "list", "Lista os posts (mais recentes primeiro).", "list [opções]"

      HEADERS = %w[DATA SLUG TÍTULO CATEGORIAS TAGS].freeze

      def define_options(o)
        @scope = :posts
        o.on("-d", "--drafts", "Só os rascunhos") { @scope = :drafts }
        o.on("-a", "--all", "Posts e rascunhos") { @scope = :all }
        o.on("-t", "--tag TAG", "Filtra por tag") { |v| @tag = v }
        o.on("-c", "--category CATEGORIA", "Filtra por categoria") { |v| @category = v }
      end

      def call(args)
        expect_args(args, 0, "nenhum argumento")
        rows = selected.filter_map { |post| row(post) }
        return say("Nenhum post encontrado.") if rows.empty?

        print_table([HEADERS, *rows])
        say "\n#{rows.size} post(s)"
      end

      private

      def selected
        posts = { posts: site.posts, drafts: site.drafts, all: site.all_posts }.fetch(@scope)
        posts.sort_by { |p| [p.draft? ? 1 : 0, -(p.display_date&.to_i || 0)] }
      end

      def row(post)
        tags = post.tags
        categories = post.categories
        return nil if @tag && !matches?(tags, @tag)
        return nil if @category && !matches?(categories, @category)

        date = post.draft? ? "rascunho" : (post.display_date ? Dates.format(post.display_date) : "?")
        [date, post.slug, post.title, categories.join(" / "), tags.join(", ")]
      rescue Error
        return nil if @tag || @category

        ["?", post.slug, "(front matter inválido: rode 'tools/post check')", "", ""]
      end

      def matches?(values, wanted)
        values.any? { |v| Slug.from(v) == Slug.from(wanted) }
      end

      def print_table(rows)
        widths = rows.transpose.map { |col| col.map(&:length).max }
        rows.each do |r|
          say r.each_with_index.map { |cell, i| cell.ljust(widths[i]) }.join("  ").rstrip
        end
      end
    end
  end
end
