# frozen_string_literal: true

module BlogTools
  class Site
    POSTS_DIR = "_posts"
    DRAFTS_DIR = "_drafts"

    attr_reader :root, :git

    def initialize(root)
      @root = File.expand_path(root)
      @git = Git.new(@root)
    end

    def config
      @config ||= load_yaml("_config.yml")
    end

    def authors
      @authors ||= load_yaml("_data/authors.yml")
    end

    def timezone = config["timezone"]
    def default_author = authors.keys.first

    def posts = entries(POSTS_DIR)
    def drafts = entries(DRAFTS_DIR)
    def all_posts = posts + drafts

    def relative(path)
      Pathname(File.expand_path(path)).relative_path_from(root).to_s
    end

    def absolute(rel)
      File.expand_path(rel, root)
    end

    # Aceita caminho (relativo ao diretório atual ou à raiz), nome do arquivo
    # com ou sem extensão, ou só o slug.
    def find(ref)
      path = [File.expand_path(ref), absolute(ref)].find { |p| File.file?(p) }
      return post_at(path) if path

      name = File.basename(ref, File.extname(ref))
      matches = all_posts.select { |p| p.basename == name || p.slug == name }
      raise Error, "nenhum post ou rascunho encontrado para '#{ref}'" if matches.empty?
      if matches.size > 1
        raise Error, "'#{ref}' é ambíguo; use o caminho: #{matches.map(&:rel_path).join(", ")}"
      end

      matches.first
    end

    # Move o post (e sua pasta de imagens) para `dest`, usando `git mv` no que
    # for rastreado, e reescreve as referências em todos os posts. Retorna o
    # post no novo lugar e os arquivos alterados pela reescrita.
    def move(post, dest)
      target = Post.new(self, dest)
      raise Error, "já existe: #{target.rel_path}" if File.exist?(target.path)
      if Dir.exist?(post.image_dir) && File.exist?(target.image_dir)
        raise Error, "a pasta de imagens já existe: #{relative(target.image_dir)}"
      end

      FileUtils.mkdir_p(File.dirname(target.path))
      move_path(post.path, target.path)
      move_path(post.image_dir, target.image_dir) if Dir.exist?(post.image_dir)
      [target, rewrite_references(post, target)]
    end

    private

    def post_at(path)
      dir = relative(File.dirname(path))
      unless [POSTS_DIR, DRAFTS_DIR].include?(dir) && Post::EXTENSIONS.include?(File.extname(path))
        raise Error, "#{relative(path)} não é um post (.md em #{POSTS_DIR}/ ou #{DRAFTS_DIR}/)"
      end

      Post.new(self, path)
    end

    def entries(dir)
      Dir.glob(File.join(root, dir, "*"))
         .select { |p| File.file?(p) && Post::EXTENSIONS.include?(File.extname(p)) }
         .sort
         .map { |p| Post.new(self, p) }
    end

    def move_path(from, to)
      if git.tracked?(relative(from))
        git.mv(relative(from), relative(to))
      else
        FileUtils.mv(from, to)
      end
    end

    def rewrite_references(old, new)
      replacements = [
        [%r{/#{Regexp.escape(Post::IMAGE_ROOT)}/#{Regexp.escape(old.basename)}(?=[/"'\s)]|\z)}, new.image_url]
      ]
      unless old.draft? || new.draft?
        replacements << [/(\{%-?\s*post_url\s+)#{Regexp.escape(old.basename)}(?=\s*-?%\})/, "\\1#{new.basename}"]
        replacements << [%r{/posts/#{Regexp.escape(old.slug)}/}, new.url] if old.slug != new.slug
      end

      all_posts.filter_map do |post|
        text = post.read
        updated = replacements.reduce(text) { |acc, (pattern, sub)| acc.gsub(pattern, sub) }
        next if updated == text

        File.write(post.path, updated)
        post.rel_path
      end
    end

    def load_yaml(rel)
      path = absolute(rel)
      return {} unless File.file?(path)

      YAML.safe_load_file(path, permitted_classes: [Date, Time], aliases: true) || {}
    rescue Psych::Exception => e
      raise Error, "#{rel}: YAML inválido (#{e.message})"
    end
  end
end
