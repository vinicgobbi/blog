# frozen_string_literal: true

module BlogTools
  module Commands
    class Publish < Base
      describe "publish", "Move um rascunho para _posts/ com a data de publicação (e leva as imagens junto).",
               "publish <rascunho> [opções]"

      def define_options(o)
        o.on("--date DATA", "Data de publicação, AAAA-MM-DD HH:MM (padrão: agora)") { |v| @date = v }
      end

      def call(args)
        expect_args(args, 1, "o rascunho (caminho, nome ou slug)")
        draft = site.find(args.first)
        raise Error, "#{draft.rel_path} já está publicado" unless draft.draft?

        draft.front # falha antes de mover se o front matter estiver quebrado
        if (existing = published_with_slug(draft.slug))
          raise Error, "já existe um post com o slug '#{draft.slug}' (#{existing.rel_path}); renomeie o rascunho antes"
        end

        date = @date ? parse_date(@date) : now
        dest = site.absolute(File.join(Site::POSTS_DIR, "#{date.strftime("%Y-%m-%d")}-#{draft.slug}#{draft.ext}"))
        post, changed = site.move(draft, dest)

        post.front.set("date", Dates.format(date), after: "title").delete("last_modified_at")
        post.save!

        say "Publicado: #{draft.rel_path} -> #{post.rel_path}"
        say "URL: #{post.url}"
        changed.each { |file| say "Referências atualizadas: #{file}" }
        notice "aviso: data no futuro; o post só aparece no site a partir de #{Dates.format(date)}" if date > now
      end
    end
  end
end
