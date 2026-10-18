# frozen_string_literal: true

module BlogTools
  module Commands
    class Base
      class << self
        attr_reader :command_name, :summary, :usage

        def describe(name, summary, usage)
          @command_name = name
          @summary = summary
          @usage = usage
        end
      end

      attr_reader :cli

      def initialize(cli)
        @cli = cli
      end

      def run(argv)
        args = parser.parse(argv)
        return say(parser.help) || 0 if @help

        result = call(args)
        result.is_a?(Integer) ? result : 0
      end

      def parser
        @parser ||= OptionParser.new do |o|
          o.banner = "Uso: tools/post #{self.class.usage}"
          o.separator ""
          o.separator self.class.summary
          o.separator ""
          o.separator "Opções:"
          define_options(o)
          o.on("-h", "--help", "Mostra esta ajuda") { @help = true }
        end
      end

      private

      def define_options(_opts); end

      def site = cli.site
      def now = cli.now

      def say(message = "")
        cli.out.puts(message)
        nil
      end

      def notice(message)
        cli.err.puts(message)
      end

      def parse_date(value)
        Dates.parse(value) || raise(Error, "data inválida: '#{value}' (use AAAA-MM-DD HH:MM)")
      end

      def expect_args(args, count, what)
        return if args.size == count

        raise Error, "esperado #{what}#{args.size > count ? "; argumentos a mais: #{args.drop(count).join(" ")}" : ""}"
      end

      def clean_list(values)
        Array(values).map(&:strip).reject(&:empty?).uniq
      end

      def published_with_slug(slug, except: nil)
        site.posts.find { |p| p.slug == slug && p.path != except&.path }
      end
    end
  end
end
