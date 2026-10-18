# frozen_string_literal: true

module BlogTools
  module Commands
    class Hooks < Base
      describe "hooks",
               "Liga/desliga o pre-commit do blog (lastmod --staged + check) via core.hooksPath.",
               "hooks install|uninstall|status [opções]"

      HOOKS_PATH = "tools/hooks"

      def define_options(o)
        o.on("-f", "--force", "Substitui um core.hooksPath já configurado") { @force = true }
      end

      def call(args)
        expect_args(args, 1, "install, uninstall ou status") unless args.empty?
        raise Error, "não é um repositório git" unless site.git.repo?

        case args.first || "status"
        when "install" then install
        when "uninstall" then uninstall
        when "status" then status
        else raise Error, "subcomando desconhecido: '#{args.first}' (use install, uninstall ou status)"
        end
      end

      private

      def current = site.git.config_get("core.hooksPath")

      def install
        if current && current != HOOKS_PATH && !@force
          raise Error, "core.hooksPath já aponta para '#{current}'; use --force para substituir"
        end

        Dir.glob(site.absolute(File.join(HOOKS_PATH, "*"))).each { |hook| File.chmod(0o755, hook) }
        site.git.config_set("core.hooksPath", HOOKS_PATH)
        say "Hooks instalados (core.hooksPath = #{HOOKS_PATH}). Para pular uma vez: git commit --no-verify"
      end

      def uninstall
        return say("Os hooks do blog não estão instalados.") unless current == HOOKS_PATH

        site.git.config_unset("core.hooksPath")
        say "Hooks desinstalados."
      end

      def status
        case current
        when HOOKS_PATH then say "Instalados (core.hooksPath = #{HOOKS_PATH})."
        when nil then say "Não instalados. Rode: tools/post hooks install"
        else say "Não instalados; core.hooksPath aponta para '#{current}'."
        end
      end
    end
  end
end
