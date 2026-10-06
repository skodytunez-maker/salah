# frozen_string_literal: true
# Generated ios/ is disposable; tracked native sources and this idempotent setup are authoritative.
require 'json'
require 'fileutils'
require 'rexml/document'
gem 'xcodeproj', '1.27.0'
require 'xcodeproj'

root = File.expand_path('..', __dir__)
config = JSON.parse(File.read(File.join(root, 'capacitor.config.json')))
app_id = config.fetch('appId')
abort 'Invalid app identifier' unless app_id.match?(/\A[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+\z/)
app_group = "group.#{app_id}"
project_dir = File.join(root, 'ios', 'App')
project_path = File.join(project_dir, 'App.xcodeproj')
abort 'Run npm run ios:add on macOS first.' unless File.directory?(project_path)

project = Xcodeproj::Project.open(project_path)
app = project.targets.find { |target| target.name == 'App' && target.product_type == 'com.apple.product-type.application' }
abort 'Expected Capacitor App target is missing; no project files changed.' unless app

# Replace Capacitor's starter icon with SALAH's existing PWA brand icon.
icon_set_path = File.join(project_dir, 'App', 'Assets.xcassets', 'AppIcon.appiconset')
icon_source = File.expand_path('../dist/icon-512.png', root)
icon_path = File.join(icon_set_path, 'AppIcon.png')
abort 'Expected Capacitor AppIcon asset catalog is missing.' unless File.directory?(icon_set_path)
abort 'SALAH source icon is missing.' unless File.file?(icon_source)
unless system('/usr/bin/sips', '-z', '1024', '1024', icon_source, '--out', icon_path, out: File::NULL, err: File::NULL)
  abort 'Could not create the required 1024px SALAH app icon.'
end
File.write(File.join(icon_set_path, 'Contents.json'), JSON.pretty_generate({
  'images' => [{'filename' => 'AppIcon.png', 'idiom' => 'universal', 'platform' => 'ios', 'size' => '1024x1024'}],
  'info' => {'author' => 'xcode', 'version' => 1}
}) + "\\n")

widget = project.targets.find { |target| target.name == 'SalahPrayerWidget' }
widget ||= project.new_target(:app_extension, 'SalahPrayerWidget', :ios, '16.0')

native_dir = File.join(project_dir, 'SalahNative')
widget_dir = File.join(project_dir, 'SalahWidgets')
FileUtils.mkdir_p([native_dir, widget_dir])
source_dir = File.join(root, 'native', 'ios')

%w[
  PrayerWidgetModel.swift
  PrayerWidgetStore.swift
  SalahWidgetPlugin.swift
  SalahBridgeViewController.swift
].each do |name|
  FileUtils.cp(File.join(source_dir, name), File.join(native_dir, name))
end

FileUtils.cp(
  File.join(source_dir, 'SalahPrayerWidget.swift'),
  File.join(widget_dir, 'SalahPrayerWidget.swift')
)

def group_for(project, name)
  project.main_group.groups.find { |item| item.display_name == name } ||
    project.main_group.new_group(name, name)
end

def source_file(group, name, targets)
  ref = group.files.find { |file| file.path == name } || group.new_file(name)
  targets.each do |target|
    target.source_build_phase.add_file_reference(ref, true) unless target.source_build_phase.files_references.include?(ref)
  end
end

native_group = group_for(project, 'SalahNative')
widget_group = group_for(project, 'SalahWidgets')

%w[PrayerWidgetModel.swift PrayerWidgetStore.swift].each do |name|
  source_file(native_group, name, [app, widget])
end

%w[SalahWidgetPlugin.swift SalahBridgeViewController.swift].each do |name|
  source_file(native_group, name, [app])
end

source_file(widget_group, 'SalahPrayerWidget.swift', [widget])

existing_entitlements = app.build_configurations.first.build_settings['CODE_SIGN_ENTITLEMENTS']
app_entitlements =
  if existing_entitlements && File.file?(File.join(project_dir, existing_entitlements))
    Xcodeproj::Plist.read_from_path(File.join(project_dir, existing_entitlements))
  else
    {}
  end

app_entitlements['com.apple.security.application-groups'] =
  ((app_entitlements['com.apple.security.application-groups'] || []) + [app_group]).uniq

Xcodeproj::Plist.write_to_path(
  app_entitlements,
  File.join(native_dir, 'SalahApp.entitlements')
)

Xcodeproj::Plist.write_to_path(
  {'com.apple.security.application-groups' => [app_group]},
  File.join(widget_dir, 'SalahWidget.entitlements')
)

app_plist_path = File.join(project_dir, 'App', 'Info.plist')
app_plist = Xcodeproj::Plist.read_from_path(app_plist_path)
app_plist['SALAHAppGroup'] = app_group
Xcodeproj::Plist.write_to_path(app_plist, app_plist_path)

widget_plist = {
  'CFBundleDisplayName' => 'SALAH',
  'CFBundleName' => '$(PRODUCT_NAME)',
  'CFBundleIdentifier' => '$(PRODUCT_BUNDLE_IDENTIFIER)',
  'CFBundleExecutable' => '$(EXECUTABLE_NAME)',
  'CFBundlePackageType' => 'XPC!',
  'CFBundleInfoDictionaryVersion' => '6.0',
  'CFBundleShortVersionString' => '$(MARKETING_VERSION)',
  'CFBundleVersion' => '$(CURRENT_PROJECT_VERSION)',
  'SALAHAppGroup' => app_group,
  'NSExtension' => {
    'NSExtensionPointIdentifier' => 'com.apple.widgetkit-extension'
  }
}

Xcodeproj::Plist.write_to_path(
  widget_plist,
  File.join(widget_dir, 'Info.plist')
)

app.build_configurations.each do |configuration|
  settings = configuration.build_settings
  settings['CODE_SIGN_ENTITLEMENTS'] = 'SalahNative/SalahApp.entitlements'
  settings['IPHONEOS_DEPLOYMENT_TARGET'] =
    [settings.fetch('IPHONEOS_DEPLOYMENT_TARGET', '16.0').to_f, 16.0].max.to_s
end

widget.build_configurations.each do |configuration|
  inherited =
    app.build_configurations.find { |item| item.name == configuration.name } ||
    app.build_configurations.first

  configuration.build_settings.merge!({
    'PRODUCT_NAME' => 'SalahPrayerWidget',
    'PRODUCT_MODULE_NAME' => 'SalahPrayerWidget',
    'EXECUTABLE_NAME' => '$(EXECUTABLE_PREFIX)$(PRODUCT_NAME)$(EXECUTABLE_SUFFIX)',
    'WRAPPER_EXTENSION' => 'appex',
    'PRODUCT_BUNDLE_IDENTIFIER' => "#{app_id}.prayerwidget",
    'INFOPLIST_FILE' => 'SalahWidgets/Info.plist',
    'GENERATE_INFOPLIST_FILE' => 'NO',
    'CODE_SIGN_ENTITLEMENTS' => 'SalahWidgets/SalahWidget.entitlements',
    'CODE_SIGN_STYLE' => 'Automatic',
    'SWIFT_VERSION' => '5.0',
    'IPHONEOS_DEPLOYMENT_TARGET' => '16.0',
    'TARGETED_DEVICE_FAMILY' => '1,2',
    'APPLICATION_EXTENSION_API_ONLY' => 'YES',
    'SKIP_INSTALL' => 'YES',
    'LD_RUNPATH_SEARCH_PATHS' => [
      '$(inherited)',
      '@executable_path/Frameworks',
      '@executable_path/../../Frameworks'
    ],
    'MARKETING_VERSION' => inherited.build_settings.fetch('MARKETING_VERSION', '1.0'),
    'CURRENT_PROJECT_VERSION' => inherited.build_settings.fetch('CURRENT_PROJECT_VERSION', '1')
  })
end

widget.product_reference.path = 'SalahPrayerWidget.appex'
widget.product_reference.name = 'SalahPrayerWidget.appex'

app.add_dependency(widget) unless app.dependencies.any? { |dependency| dependency.target == widget }

embed = app.copy_files_build_phases.find { |phase| phase.name == 'Embed App Extensions' }
embed ||= app.new_copy_files_build_phase('Embed App Extensions')
embed.dst_subfolder_spec = '13'

unless embed.files_references.include?(widget.product_reference)
  file = embed.add_file_reference(widget.product_reference, true)
  file.settings = {'ATTRIBUTES' => ['RemoveHeadersOnCopy']}
end

storyboard_path = File.join(project_dir, 'App', 'Base.lproj', 'Main.storyboard')
document = REXML::Document.new(File.read(storyboard_path))
already_custom = REXML::XPath.first(document, '//*[@customClass="SalahBridgeViewController"]')
default_controller = REXML::XPath.first(document, '//*[@customClass="CAPBridgeViewController"]')

unless already_custom
  abort 'Unknown main view controller; refusing to replace it.' unless default_controller
  default_controller.attributes['customClass'] = 'SalahBridgeViewController'
  default_controller.attributes['customModule'] = 'App'
  default_controller.attributes['customModuleProvider'] = 'target'
  File.write(storyboard_path, document.to_s)
end

project.save
puts "SALAH: WidgetKit target embedded; App Group #{app_group}; configure repeated safely."
