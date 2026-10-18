# frozen_string_literal: true

module BlogTools
  # Serializa valores para uma linha de front matter no estilo dos posts
  # existentes: `title: "..."`, `tags: [linux, windows]`.
  module YamlValue
    PLAIN = %r{\A[\p{L}\p{N}][\p{L}\p{N} _./-]*(?<! )\z}
    ESCAPES = { '"' => '\\"', "\\" => "\\\\", "\n" => "\\n", "\t" => "\\t", "\r" => "\\r" }.freeze

    module_function

    def quote(value)
      %("#{value.to_s.gsub(/["\\\n\t\r]/, ESCAPES)}")
    end

    # Sem aspas quando o YAML leria o texto de volta como a mesma string
    # (evita que "2024", "yes" ou "null" virem número, booleano ou nulo).
    def scalar(value)
      str = value.to_s
      plain?(str) ? str : quote(str)
    end

    def list(values)
      "[#{values.map { |v| scalar(v) }.join(", ")}]"
    end

    def plain?(str)
      return false unless PLAIN.match?(str)

      YAML.safe_load(str) == str
    rescue Psych::Exception
      false
    end
  end
end
