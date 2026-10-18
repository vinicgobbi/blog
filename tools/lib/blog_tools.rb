# frozen_string_literal: true

require "date"
require "fileutils"
require "open3"
require "optparse"
require "pathname"
require "shellwords"
require "time"
require "yaml"

module BlogTools
  # Erro esperado (entrada inválida, arquivo ausente...): o CLI mostra só a
  # mensagem, sem backtrace.
  class Error < StandardError; end
end

require_relative "blog_tools/slug"
require_relative "blog_tools/dates"
require_relative "blog_tools/yaml_value"
require_relative "blog_tools/front_matter"
require_relative "blog_tools/git"
require_relative "blog_tools/post"
require_relative "blog_tools/site"
require_relative "blog_tools/checker"
require_relative "blog_tools/commands/base"
require_relative "blog_tools/commands/new"
require_relative "blog_tools/commands/publish"
require_relative "blog_tools/commands/rename"
require_relative "blog_tools/commands/list"
require_relative "blog_tools/commands/check"
require_relative "blog_tools/commands/lastmod"
require_relative "blog_tools/commands/hooks"
require_relative "blog_tools/cli"
