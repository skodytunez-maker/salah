# frozen_string_literal: true
require 'json'
require 'digest'
require 'fileutils'
gem 'xcodeproj', '1.27.0'
require 'xcodeproj'

root = File.expand_path('..', __dir__)
output = File.join(root, 'reports')
packages = Gem.loaded_specs.values.reject(&:default_gem?).sort_by(&:name).map do |spec|
  notices = Dir.children(spec.full_gem_path).sort.filter_map do |name|
    next unless name.match?(/\A(?:licen[cs]e|unlicen[cs]e|copying|notice)(?:[._-].*)?\z/i)
    file = File.join(spec.full_gem_path, name)
    next unless File.file?(file)
    bytes = File.binread(file)
    raise 'Oversized gem notice' if bytes.bytesize > 1024 * 1024
    {'file' => name, 'sha256' => Digest::SHA256.hexdigest(bytes), 'text' => bytes.force_encoding('UTF-8')}
  end
  {'name' => spec.name, 'version' => spec.version.to_s, 'declaredLicenses' => spec.licenses,
   'notices' => notices, 'status' => notices.empty? ? 'needs-review' : 'notice-recorded'}
end
FileUtils.mkdir_p(output)
report = {'schemaVersion' => 1, 'scope' => 'Loaded non-default Ruby gems for the Xcode project generator. Build tools only; not packaged in SALAH. Missing notices need review.', 'packages' => packages}
File.write(File.join(output, 'ios-build-gems.json'), JSON.pretty_generate(report) + "\n")
puts "SALAH build gem evidence: #{packages.length} loaded components; #{packages.count { |item| item['status'] == 'needs-review' }} need review."
