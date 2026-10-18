# frozen_string_literal: true

module BlogTools
  # Um arquivo em _posts/ (AAAA-MM-DD-slug.md) ou _drafts/ (slug.md).
  # As imagens ficam em assets/img/posts/<nome do arquivo sem extensão>/.
  class Post
    DATED_NAME = /\A(?<date>\d{4}-\d{2}-\d{2})-(?<slug>.+)\z/
    EXTENSIONS = %w[.md .markdown].freeze
    IMAGE_ROOT = "assets/img/posts"

    attr_reader :site, :path

    def self.list(value)
      case value
      when Array then value.map(&:to_s)
      when nil then []
      else value.to_s.split # o Jekyll também separa strings por espaço
      end
    end

    def initialize(site, path)
      @site = site
      @path = File.expand_path(path)
    end

    def rel_path = site.relative(path)
    def draft? = File.basename(File.dirname(path)) == Site::DRAFTS_DIR
    def ext = File.extname(path)
    def basename = File.basename(path, ext)

    def name_match
      draft? ? nil : DATED_NAME.match(basename)
    end

    def slug
      name_match ? name_match[:slug] : basename
    end

    def file_date
      name_match && Date.strptime(name_match[:date], "%Y-%m-%d")
    rescue Date::Error
      nil
    end

    # Permalink do _config.yml do Chirpy: /posts/:title/
    def url = "/posts/#{slug}/"
    def image_dir = File.join(site.root, IMAGE_ROOT, basename)
    def image_url = "/#{IMAGE_ROOT}/#{basename}"

    def read
      File.read(path, encoding: "UTF-8")
    end

    def front
      @front ||= FrontMatter.parse(read, path: rel_path)
    end

    def title = front["title"].to_s
    def date = Dates.parse(front["date"])
    def tags = Post.list(front["tags"])
    def categories = Post.list(front["categories"])

    # Data usada para ordenar e exibir: a do front matter ou a do nome.
    def display_date
      date || (file_date && Dates.parse(file_date))
    rescue Error
      file_date && Dates.parse(file_date)
    end

    def save!
      File.write(path, front.to_s)
    end
  end
end
