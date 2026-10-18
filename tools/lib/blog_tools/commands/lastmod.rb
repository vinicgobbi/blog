# frozen_string_literal: true

module BlogTools
  module Commands
    # Carimba `last_modified_at` com o horário atual. Sem argumentos, só nos
    # posts publicados com alterações pendentes no git; posts novos (ou que
    # acabaram de sair de _drafts/) ficam de fora, porque ainda não foram
    # "atualizados". Rascunhos nunca recebem o campo.
    #
    # Obs.: no build, o _plugins/posts-lastmod-hook.rb sobrescreve o campo com a
    # data do último commit quando o post tem mais de um commit.
    class Lastmod < Base
      describe "lastmod", "Atualiza 'last_modified_at' nos posts editados (use antes do commit, ou via hook).",
               "lastmod [post ...] [opções]"

      def define_options(o)
        o.on("--staged", "Só posts no índice do git, e os adiciona de novo após editar (modo do hook)") do
          @staged = true
        end
        o.on("--date DATA", "Usa esta data em vez de agora (AAAA-MM-DD HH:MM)") { |v| @date = v }
        o.on("-n", "--dry-run", "Só mostra o que mudaria") { @dry_run = true }
      end

      def call(args)
        time = @date ? parse_date(@date) : now
        posts = args.empty? ? pending_posts : args.map { |ref| site.find(ref) }
        if posts.empty?
          say "Nenhum post editado para atualizar." unless @staged
          return
        end

        posts.each { |post| stamp(post, time) }
      end

      private

      def stamp(post, time)
        return notice("pulado (rascunho): #{post.rel_path}") if post.draft?

        published = post.date
        if published && time < published
          return notice("pulado (data de publicação no futuro): #{post.rel_path}")
        end

        value = Dates.format(time)
        current = Dates.parse(post.front["last_modified_at"])
        return say("já atualizado: #{post.rel_path}") if current && Dates.format(current) == value

        post.front.set("last_modified_at", value, after: %w[date title])
        unless @dry_run
          post.save!
          site.git.add(post.rel_path) if @staged
        end
        say "#{post.rel_path} -> #{value}#{" (dry-run)" if @dry_run}"
      end

      def pending_posts
        raise Error, "não é um repositório git; passe os posts explicitamente" unless site.git.repo?

        site.git.status(Site::POSTS_DIR).filter_map do |entry|
          next unless entry.path.start_with?("#{Site::POSTS_DIR}/") && Post::EXTENSIONS.include?(File.extname(entry.path))
          next if entry.deleted? || entry.added?
          next if entry.renamed? && !entry.orig_path.start_with?("#{Site::POSTS_DIR}/")

          if @staged
            next unless entry.staged?
            if entry.unstaged?
              notice "pulado (tem alterações fora do índice; 'git add' antes): #{entry.path}"
              next
            end
          end

          Post.new(site, site.absolute(entry.path))
        end
      end
    end
  end
end
