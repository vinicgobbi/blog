# frozen_string_literal: true

module BlogTools
  module Commands
    class Rename < Base
      describe "rename",
               "Muda o título e/ou o slug de um post, movendo arquivo e imagens e atualizando as referências.",
               "rename <post> [--title \"Novo título\"] [--slug [SLUG]] [--force]"

      def define_options(o)
        o.on("-t", "--title TÍTULO", "Novo título") { |v| @title = v }
        o.on("-s", "--slug [SLUG]", "Novo slug; sem valor, gera a partir do título") do |v|
          @reslug = true
          @slug = v
        end
        o.on("-f", "--force", "Permite mudar a URL de um post já publicado") { @force = true }
      end

      def call(args)
        expect_args(args, 1, "o post (caminho, nome ou slug)")
        raise Error, "informe --title e/ou --slug" unless @title || @reslug
        raise Error, "o título não pode ser vazio" if @title&.strip&.empty?

        post = site.find(args.first)
        post.front
        old_path = post.rel_path

        post = reslug(post) if @reslug
        if @title
          post.front.set("title", YamlValue.quote(@title.strip))
          post.save!
          say "Título: #{@title.strip}"
        end
        say "Arquivo: #{old_path} -> #{post.rel_path}" if old_path != post.rel_path
      end

      private

      def reslug(post)
        slug = @slug || Slug.from(@title || post.title)
        raise Error, "slug inválido: '#{slug}' (use minúsculas, números e hífens)" unless Slug.valid?(slug)
        return post if slug == post.slug

        check_slug(post, slug)
        new_name = post.draft? ? slug : "#{post.name_match[:date]}-#{slug}"
        moved, changed = site.move(post, File.join(File.dirname(post.path), "#{new_name}#{post.ext}"))

        say "URL: #{post.url} -> #{moved.url}" unless post.draft?
        changed.each { |file| say "Referências atualizadas: #{file}" }
        moved
      end

      def check_slug(post, slug)
        if (existing = published_with_slug(slug, except: post))
          raise Error, "já existe um post com o slug '#{slug}' (#{existing.rel_path})"
        end
        return if post.draft?

        raise Error, "#{post.rel_path}: nome fora do padrão AAAA-MM-DD-slug" unless post.name_match
        return if @force

        raise Error, <<~MSG.chomp
          a URL pública mudaria de #{post.url} para /posts/#{slug}/.
          Links externos, buscadores e os comentários do Disqus continuam na URL antiga.
          Use --force para confirmar, ou só --title para trocar o título mantendo a URL.
        MSG
      end
    end
  end
end
