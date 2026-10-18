# frozen_string_literal: true

module BlogTools
  class Git
    # Uma linha do `git status --porcelain -z`. `x` = índice, `y` = árvore.
    Entry = Struct.new(:x, :y, :path, :orig_path) do
      def untracked? = x == "?"
      def added? = untracked? || x == "A"
      def deleted? = x == "D" || y == "D"
      def renamed? = %w[R C].include?(x)
      def staged? = !untracked? && x != " "
      def unstaged? = untracked? || y != " "
    end

    # Com -z, renomeações/cópias vêm como "XY destino\0origem\0".
    def self.parse_status(output)
      tokens = output.split("\0")
      entries = []
      until tokens.empty?
        token = tokens.shift
        next if token.empty?

        x = token[0]
        orig = %w[R C].include?(x) ? tokens.shift : nil
        entries << Entry.new(x, token[1], token[3..], orig)
      end
      entries
    end

    def initialize(root)
      @root = root
    end

    def repo?
      return @repo if defined?(@repo)

      @repo = capture("rev-parse", "--is-inside-work-tree").last
    end

    def status(*paths)
      self.class.parse_status(run("status", "--porcelain", "-z", "--untracked-files=all", "--", *paths))
    end

    # Arquivo rastreado, ou pasta com algum arquivo rastreado.
    def tracked?(path)
      repo? && !run("ls-files", "--", path).empty?
    end

    def mv(from, to)
      run("mv", from, to)
    end

    def add(*paths)
      run("add", "--", *paths)
    end

    def config_get(key)
      out, ok = capture("config", "--local", "--get", key)
      ok ? out.strip : nil
    end

    def config_set(key, value)
      run("config", "--local", key, value)
    end

    def config_unset(key)
      run("config", "--local", "--unset", key)
    end

    private

    def run(*args)
      out, err, status = Open3.capture3("git", "-C", @root, *args)
      raise Error, "git #{args.first} falhou: #{err.strip}" unless status.success?

      out
    end

    def capture(*args)
      out, _err, status = Open3.capture3("git", "-C", @root, *args)
      [out, status.success?]
    rescue SystemCallError
      ["", false]
    end
  end
end
