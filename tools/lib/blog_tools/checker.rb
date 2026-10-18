# frozen_string_literal: true

module BlogTools
  # Validações dos posts. Erros quebram o build ou o site (imagem ausente,
  # post_url inválido, URL duplicada...); avisos são suspeitas.
  class Checker
    Issue = Struct.new(:level, :file, :message) do
      def error? = level == :error
    end

    MARKDOWN_IMAGE = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/
    HTML_IMAGE = /<img\b[^>]*?\ssrc\s*=\s*["']([^"']+)["']/i
    POST_URL = /\{%-?\s*post_url\s+(\S+?)\s*-?%\}/
    FENCED_CODE = /^ {0,3}(`{3,}|~{3,}).*?^ {0,3}\1[ \t]*$/m

    def initialize(site, now:)
      @site = site
      @now = now
      @issues = []
    end

    # `only`: restringe as verificações por arquivo a esses posts e pula as
    # verificações do site inteiro (pastas órfãs, tags parecidas).
    def run(only: nil)
      posts = @site.all_posts
      targets = only ? posts.select { |p| only.any? { |o| o.path == p.path } } : posts

      targets.each { |post| check_post(post) }
      check_duplicate_slugs(posts, targets)
      unless only
        check_taxonomy(posts, "tags", "tags")
        check_taxonomy(posts, "categories", "categorias")
        check_orphan_image_dirs(posts)
      end

      @issues
    end

    private

    def error(file, message) = @issues << Issue.new(:error, file, message)
    def warning(file, message) = @issues << Issue.new(:warning, file, message)

    def check_post(post)
      file = post.rel_path
      front = begin
        post.front
      rescue Error => e
        return error(file, e.message.delete_prefix("#{file}: "))
      end

      error(file, "sem 'title'") if front["title"].to_s.strip.empty?
      warning(file, "slug '#{post.slug}' fora do padrão (minúsculas, números e hífens)") unless Slug.valid?(post.slug)

      date = check_dates(post, front, file)
      check_authors(front, file)
      check_lists(front, file)
      check_images(post, front, file)
      check_post_urls(front, file)
      date
    end

    def check_dates(post, front, file)
      date = nil
      if front.key?("date")
        date = Dates.parse(front["date"])
        error(file, "'date' inválida: #{front["date"].inspect} (use AAAA-MM-DD HH:MM)") unless date
      elsif !post.draft?
        warning(file, "sem 'date' (o Jekyll vai usar só o dia do nome do arquivo)")
      end

      unless post.draft?
        if post.name_match.nil? || post.file_date.nil?
          error(file, "nome do arquivo deve seguir AAAA-MM-DD-slug.md")
        elsif date && date.to_date != post.file_date
          warning(file, "'date' (#{date.to_date}) difere da data do nome do arquivo (#{post.file_date})")
        end
        warning(file, "data no futuro (#{Dates.format(date)}): o post só aparece no site depois dela") if date && date > @now
      end

      if front.key?("last_modified_at")
        lastmod = Dates.parse(front["last_modified_at"])
        if lastmod.nil?
          error(file, "'last_modified_at' inválida: #{front["last_modified_at"].inspect}")
        elsif date && lastmod < date
          warning(file, "'last_modified_at' (#{Dates.format(lastmod)}) é anterior a 'date' (#{Dates.format(date)})")
        end
      end
      date
    end

    def check_authors(front, file)
      return if @site.authors.empty?

      (Post.list(front["author"]) + Post.list(front["authors"])).each do |author|
        error(file, "autor '#{author}' não existe em _data/authors.yml") unless @site.authors.key?(author)
      end
    end

    def check_lists(front, file)
      %w[tags categories].each do |key|
        value = front[key]
        warning(file, "'#{key}' deveria ser uma lista, ex.: [a, b]") unless value.nil? || value.is_a?(Array)
      end
      categories = Post.list(front["categories"])
      warning(file, "o Chirpy usa só as 2 primeiras categorias (há #{categories.size})") if categories.size > 2
    end

    def check_images(post, front, file)
      subpath = front["media_subpath"]
      used = []

      image_refs(front).each do |ref|
        path = resolve_image(ref, subpath)
        case path
        when nil then next
        when :relative
          warning(file, "imagem com caminho relativo sem 'media_subpath': #{ref}")
        else
          used << path
          error(file, "imagem não encontrada: #{ref}") unless File.file?(path)
        end
      end

      return unless Dir.exist?(post.image_dir)

      Dir.glob(File.join(post.image_dir, "**", "*")).select { |f| File.file?(f) }.sort.each do |image|
        warning(file, "imagem não usada: #{@site.relative(image)}") unless used.include?(image)
      end
    end

    def image_refs(front)
      body = front.body.gsub(FENCED_CODE, "")
      refs = body.scan(MARKDOWN_IMAGE).flatten + body.scan(HTML_IMAGE).flatten
      cover = front["image"]
      cover = cover["path"] if cover.is_a?(Hash)
      refs << cover.to_s if cover.is_a?(String) && !cover.empty?
      refs
    end

    # Caminho absoluto no disco; nil para URLs externas; :relative quando não
    # há como saber para onde o caminho aponta.
    def resolve_image(ref, subpath)
      return nil if ref.match?(%r{\A(?:[a-z][a-z0-9+.-]*:|//|#|\{)}i)

      path = ref.sub(/[?#].*\z/, "").b.gsub(/%(\h\h)/n) { [Regexp.last_match(1).hex].pack("C") }.force_encoding("UTF-8")
      unless path.start_with?("/")
        return :relative if subpath.to_s.empty?

        path = File.join("/", subpath.to_s, path)
      end
      File.join(@site.root, path)
    end

    def check_post_urls(front, file)
      names = @site.posts.map(&:basename)
      front.body.gsub(FENCED_CODE, "").scan(POST_URL).flatten.each do |name|
        error(file, "post_url aponta para um post que não existe: #{name}") unless names.include?(name)
      end
    end

    def check_duplicate_slugs(posts, targets)
      published = posts.reject(&:draft?).group_by(&:slug)
      targets.each do |post|
        others = (published[post.slug] || []).reject { |p| p.path == post.path }
        next if others.empty?

        if post.draft?
          warning(post.rel_path, "já existe um post publicado com o slug '#{post.slug}': #{others.map(&:rel_path).join(", ")}")
        else
          error(post.rel_path, "URL #{post.url} duplicada com #{others.map(&:rel_path).join(", ")}")
        end
      end
    end

    # "Linux" e "linux" viram a mesma página /tags/linux/ no Chirpy.
    def check_taxonomy(posts, key, label)
      usage = Hash.new { |h, k| h[k] = [] }
      posts.each do |post|
        Post.list(post.front[key]).each { |value| usage[value] << post.rel_path }
      rescue Error
        next
      end

      usage.keys.group_by { |value| Slug.from(value) }.each_value do |variants|
        next if variants.size < 2

        details = variants.map { |v| "'#{v}' (#{usage[v].uniq.join(", ")})" }.join(", ")
        warning(nil, "#{label} parecidas: #{details}")
      end
    end

    def check_orphan_image_dirs(posts)
      base = File.join(@site.root, Post::IMAGE_ROOT)
      return unless Dir.exist?(base)

      names = posts.map(&:basename)
      Dir.children(base).sort.each do |name|
        dir = File.join(base, name)
        next unless File.directory?(dir) && !names.include?(name)
        next if Dir.glob(File.join(dir, "**", "*")).none? { |f| File.file?(f) }

        warning(@site.relative(dir), "pasta de imagens sem post correspondente")
      end
    end
  end
end
