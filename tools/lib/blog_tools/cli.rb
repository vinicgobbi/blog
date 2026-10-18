# frozen_string_literal: true

module BlogTools
  class CLI
    COMMANDS = [
      Commands::New, Commands::Publish, Commands::Rename, Commands::List,
      Commands::Check, Commands::Lastmod, Commands::Hooks
    ].to_h { |c| [c.command_name, c] }.freeze

    attr_reader :site, :out, :err

    def initialize(root:, out: $stdout, err: $stderr, clock: -> { Time.now })
      @site = Site.new(root)
      @out = out
      @err = err
      @clock = clock
    end

    def now = @clock.call

    def run(argv)
      argv = argv.dup
      name = argv.shift

      if name.nil? || %w[help -h --help].include?(name)
        command = COMMANDS[argv.first]
        out.puts(command ? command.new(self).parser.help : usage)
        return 0
      end

      command = COMMANDS[name]
      unless command
        err.puts "erro: comando desconhecido '#{name}'\n\n#{usage}"
        return 1
      end

      command.new(self).run(argv)
    rescue Error => e
      err.puts "erro: #{e.message}"
      1
    rescue OptionParser::ParseError => e
      err.puts "erro: #{e.message}\nVeja: tools/post help #{name}"
      1
    rescue Interrupt
      130
    end

    def usage
      width = COMMANDS.keys.map(&:length).max
      lines = COMMANDS.map { |name, c| "  #{name.ljust(width)}  #{c.summary}" }
      <<~USAGE
        Ferramentas para os posts do blog.

        Uso: tools/post <comando> [opções]

        Comandos:
        #{lines.join("\n")}

        Ajuda de um comando: tools/post help <comando>
      USAGE
    end
  end
end
