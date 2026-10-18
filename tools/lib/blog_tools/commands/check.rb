# frozen_string_literal: true

module BlogTools
  module Commands
    class Check < Base
      describe "check",
               "Valida front matter, datas, autores, imagens, post_url, slugs duplicados e tags/categorias parecidas.",
               "check [post ...] [opções]"

      LABELS = { error: "erro", warning: "aviso" }.freeze

      def define_options(o)
        o.on("--strict", "Avisos também fazem o comando falhar") { @strict = true }
        o.on("-q", "--quiet", "Só mostra o resumo se houver problemas") { @quiet = true }
      end

      def call(args)
        only = args.empty? ? nil : args.map { |ref| site.find(ref) }
        issues = Checker.new(site, now: now).run(only: only)
        errors, warnings = issues.partition(&:error?).map(&:size)

        issues.group_by(&:file).sort_by { |file, _| file.to_s }.each do |file, list|
          say file || "(site)"
          list.sort_by { |i| i.error? ? 0 : 1 }.each { |i| say "  #{LABELS[i.level]}: #{i.message}" }
        end

        count = only ? only.size : site.all_posts.size
        say "#{count} arquivo(s) verificado(s): #{errors} erro(s), #{warnings} aviso(s)." unless @quiet && issues.empty?
        errors.positive? || (@strict && warnings.positive?) ? 1 : 0
      end
    end
  end
end
