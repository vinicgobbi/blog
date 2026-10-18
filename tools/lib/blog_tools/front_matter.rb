# frozen_string_literal: true

module BlogTools
  # Front matter editável sem reformatar o arquivo: as leituras usam o YAML
  # interpretado, e as escritas trocam só as linhas da chave alterada
  # (preservando ordem, comentários e estilo do resto). Toda edição é
  # validada interpretando o YAML de novo.
  class FrontMatter
    PATTERN = /\A---[ \t]*\r?\n(.*?)^---[ \t]*(?:\r?\n|\z)/m

    attr_reader :body, :newline

    def self.parse(text, path: nil)
      match = PATTERN.match(text)
      raise Error, "#{path || "arquivo"}: front matter ausente (o arquivo deve começar com '---')" unless match

      new(match[1], match.post_match, newline: text[/\r?\n/], path: path)
    end

    def initialize(source, body, newline: "\n", path: nil)
      @path = path
      @lines = source.lines.map(&:chomp)
      @body = body
      @newline = newline || "\n"
      @data = load(@lines)
    end

    def [](key)
      @data[key.to_s]
    end

    def key?(key)
      @data.key?(key.to_s)
    end

    def to_h
      @data.dup
    end

    # Troca o valor de `key` (já serializado, ver YamlValue). Chave nova entra
    # logo depois da primeira chave de `after` que existir, ou no fim.
    def set(key, yaml_value, after: nil)
      key = key.to_s
      lines = @lines.dup
      line = "#{key}: #{yaml_value}"

      if (range = key_range(lines, key))
        lines[range] = [line]
      else
        anchor = Array(after).lazy.filter_map { |k| key_range(lines, k.to_s) }.first
        lines.insert(anchor ? anchor.end + 1 : lines.length, line)
      end

      replace_lines(lines)
    end

    def delete(key)
      range = key_range(@lines, key.to_s)
      return self unless range

      lines = @lines.dup
      lines.slice!(range)
      replace_lines(lines)
    end

    def to_s
      ["---", *@lines, "---"].join(@newline) + @newline + @body
    end

    private

    def replace_lines(lines)
      @data = load(lines)
      @lines = lines
      self
    end

    # A linha da chave e suas continuações (itens "- x" ou linhas indentadas).
    def key_range(lines, key)
      start = lines.index { |l| l.match?(/\A#{Regexp.escape(key)}\s*:(?:\s|\z)/) }
      return nil unless start

      finish = start
      finish += 1 while finish + 1 < lines.length && lines[finish + 1].match?(/\A(?:\s+\S|-(?:\s|\z))/)
      start..finish
    end

    def load(lines)
      data = YAML.safe_load(lines.join("\n"), permitted_classes: [Date, Time], aliases: true) || {}
      raise Error, "#{label}: o front matter não é um mapeamento YAML" unless data.is_a?(Hash)

      data
    rescue Psych::Exception => e
      raise Error, "#{label}: YAML inválido no front matter (#{e.message})"
    end

    def label
      @path || "front matter"
    end
  end
end
