# frozen_string_literal: true

module BlogTools
  module Commands
    class New < Base
      describe "new", "Cria um post (ou rascunho) com o front matter padrão e a pasta de imagens.",
               'new "Título do post" [opções]'

      def define_options(o)
        @images = true
        o.on("-t", "--tags LISTA", Array, "Tags separadas por vírgula") { |v| @tags = v }
        o.on("-c", "--categories LISTA", Array, "Categorias separadas por vírgula (máx. 2)") { |v| @categories = v }
        o.on("-a", "--author AUTOR", "Autor (padrão: primeiro de _data/authors.yml)") { |v| @author = v }
        o.on("-s", "--slug SLUG", "Slug da URL (padrão: gerado do título)") { |v| @slug = v }
        o.on("-d", "--draft", "Cria em _drafts/, sem data (publique com 'post publish')") { @draft = true }
        o.on("--date DATA", "Data de publicação, AAAA-MM-DD HH:MM (padrão: agora)") { |v| @date = v }
        o.on("--[no-]images", "Cria a pasta de imagens (padrão: sim)") { |v| @images = v }
        o.on("-o", "--open", "Abre o arquivo no $VISUAL/$EDITOR") { @open = true }
      end

      def call(args)
        expect_args(args, 1, "um título entre aspas")
        title = args.first.strip
        raise Error, "o título não pode ser vazio" if title.empty?
        raise Error, "--date não se aplica a rascunhos (a data é definida no publish)" if @draft && @date

        slug = @slug || Slug.from(title)
        raise Error, "slug inválido: '#{slug}' (use minúsculas, números e hífens)" unless Slug.valid?(slug)

        date = @date ? parse_date(@date) : now
        path = target_path(slug, date)
        check_conflicts(slug, path)

        post = Post.new(site, path)
        FileUtils.mkdir_p(File.dirname(path))
        File.write(path, FrontMatter.parse(front_matter(title, date)).to_s)
        FileUtils.mkdir_p(post.image_dir) if @images

        say "Criado: #{post.rel_path}"
        say "Imagens: #{site.relative(post.image_dir)}/ (no texto: ![descrição](#{post.image_url}/arquivo.png))" if @images
        open_editor(path) if @open
      end

      private

      def target_path(slug, date)
        if @draft
          site.absolute(File.join(Site::DRAFTS_DIR, "#{slug}.md"))
        else
          site.absolute(File.join(Site::POSTS_DIR, "#{date.strftime("%Y-%m-%d")}-#{slug}.md"))
        end
      end

      def check_conflicts(slug, path)
        raise Error, "já existe: #{site.relative(path)}" if File.exist?(path)
        if (existing = published_with_slug(slug))
          raise Error, "já existe um post com o slug '#{slug}' (#{existing.rel_path}); use --slug"
        end
        if (draft = site.drafts.find { |p| p.slug == slug })
          raise Error, "já existe um rascunho com o slug '#{slug}' (#{draft.rel_path}); use --slug"
        end
      end

      def front_matter(title, date)
        author = resolve_author
        lines = ["title: #{YamlValue.quote(title)}"]
        lines << "date: #{Dates.format(date)}" unless @draft
        lines << "author: #{YamlValue.scalar(author)}" if author
        lines << "tags: #{YamlValue.list(clean_list(@tags))}"
        lines << "categories: #{YamlValue.list(clean_list(@categories))}"
        ["---", *lines, "---", "", ""].join("\n")
      end

      def resolve_author
        author = @author || site.default_author
        return author if author.nil? || site.authors.empty? || site.authors.key?(author)

        raise Error, "autor '#{author}' não existe em _data/authors.yml (disponíveis: #{site.authors.keys.join(", ")})"
      end

      def open_editor(path)
        editor = ENV["VISUAL"].to_s.empty? ? ENV.fetch("EDITOR", "vi") : ENV["VISUAL"]
        system(*Shellwords.split(editor), path) || notice("aviso: não foi possível abrir o editor '#{editor}'")
      end
    end
  end
end
