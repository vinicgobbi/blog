#!/usr/bin/env ruby
#
# Set (or update) a single post's `last_modified_at` front matter field.
# Called by tools/update-lastmod.sh — not meant to be run directly.
#
# Usage: ruby tools/update_lastmod.rb <path> "<YYYY-MM-DD HH:MM>"

path, new_date = ARGV

content = File.read(path)

unless content =~ /\A(---\n.*?\n---\n)/m
  warn "  sem front matter, pulando: #{path}"
  exit 0
end

front = $1
rest = $~.post_match

updated =
  if front =~ /^last_modified_at:.*$/
    front.sub(/^last_modified_at:.*$/, "last_modified_at: #{new_date}")
  elsif front =~ /^date:.*$/
    front.sub(/^(date:.*)$/, "\\1\nlast_modified_at: #{new_date}")
  else
    warn "  sem campo 'date:', pulando: #{path}"
    front
  end

if updated == front
  puts "  já atualizado: #{path}"
else
  File.write(path, updated + rest)
  puts "  #{path} -> #{new_date}"
end
