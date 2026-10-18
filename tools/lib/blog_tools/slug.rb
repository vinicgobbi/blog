# frozen_string_literal: true

module BlogTools
  module Slug
    VALID = /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/

    module_function

    # "Ação & Reação!" -> "acao-reacao"
    def from(text)
      text.to_s
          .unicode_normalize(:nfkd)
          .encode("ASCII", invalid: :replace, undef: :replace, replace: "")
          .downcase
          .gsub(/[^a-z0-9]+/, "-")
          .gsub(/\A-+|-+\z/, "")
          .encode("UTF-8")
    end

    def valid?(slug)
      VALID.match?(slug.to_s)
    end
  end
end
