# frozen_string_literal: true

module BlogTools
  # Datas do front matter. Sem fuso explícito, valem no fuso do site
  # (`timezone` do _config.yml), igual ao Jekyll — o tools/post exporta TZ.
  module Dates
    FORMAT = "%Y-%m-%d %H:%M"
    PATTERN = /\A(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?)?\z/

    module_function

    def parse(value)
      case value
      when Time then value
      when Date then Time.local(value.year, value.month, value.day)
      when String then parse_string(value.strip)
      end
    end

    def format(time)
      time.strftime(FORMAT)
    end

    def parse_string(value)
      match = PATTERN.match(value) or return nil
      year, month, day, hour, min, sec, zone = match.captures
      return nil unless Date.valid_date?(year.to_i, month.to_i, day.to_i)

      args = [year, month, day, hour || 0, min || 0, sec || 0].map(&:to_i)
      return Time.local(*args) unless zone
      return Time.utc(*args) if zone == "Z"

      Time.new(*args, zone.sub(/(\d{2})(\d{2})\z/, '\1:\2'))
    rescue ArgumentError
      nil
    end
  end
end
