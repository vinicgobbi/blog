# frozen_string_literal: true

# Roda todos os testes das ferramentas: ruby tools/tests/run.rb
Dir[File.join(__dir__, "*_test.rb")].sort.each { |file| require file }
