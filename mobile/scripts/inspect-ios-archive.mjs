import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

export const nativeNoticePaths = Object.freeze([
 'third-party/Capacitor-NOTICES.txt',
 'third-party/native/Apache-2.0.txt',
 'third-party/native/Cordova-NOTICE.txt'
]);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function readBuildVersion(source) {
 const match = source.match(/export\s+const\s+APP_VERSION\s*=\s*(\d+)\s*;/);
 assert.ok(match && Number.isSafeInteger(Number(match[1])) && Number(match[1]) > 0, 'Invalid SALAH build version');
 return match[1];
}

function validateDeviceBinary(binary) {
 assert.ok(Array.isArray(binary.architectures) && binary.architectures.includes('arm64'), 'Device binary must contain arm64');
 assert.ok(binary.architectures.every(arch => ['arm64', 'arm64e'].includes(arch)), 'Unexpected device binary architecture');
 assert.match(binary.binarySha256, /^[a-f0-9]{64}$/, 'Missing binary fingerprint');
}

export function validateIosArchive(details, expected) {
 assert.equal(details.app.bundleId, expected.appId, 'Unexpected iOS application ID');
 assert.equal(details.widget.bundleId, expected.appId + '.prayerwidget', 'Unexpected WidgetKit ID');
 assert.equal(details.app.build, expected.build, 'Application build is stale');
 assert.equal(details.widget.build, expected.build, 'Widget build is stale');
 assert.equal(details.packagedWebBuild, expected.build, 'Packaged web release is stale');
 assert.match(details.app.version, /^\d+(\.\d+){0,2}$/, 'Invalid marketing version');
 assert.equal(details.widget.version, details.app.version, 'App and widget marketing versions differ');
 assert.equal(details.app.platform, 'iphoneos', 'Expected a device archive, not a simulator build');
 assert.equal(details.widget.platform, 'iphoneos', 'Expected a device WidgetKit binary');
 for (const binary of [details.app, details.widget]) {
  assert.match(binary.sdk, /^iphoneos\d/, 'Expected the iPhone device SDK');
  validateDeviceBinary(binary);
 }
 assert.equal(details.widget.extensionPoint, 'com.apple.widgetkit-extension', 'Missing WidgetKit extension');
 assert.equal(details.app.appGroup, 'group.' + expected.appId, 'Unexpected App Group configuration');
 assert.equal(details.widget.appGroup, details.app.appGroup, 'Widget App Group mismatch');
 assert.deepEqual(details.frameworks.map(item => item.name).sort(), [...expected.frameworks].sort(), 'Missing or unexpected embedded native frameworks');
 for (const framework of details.frameworks) validateDeviceBinary(framework);
 assert.deepEqual(details.notices.map(item => item.path).sort(), [...nativeNoticePaths].sort(), 'Missing, duplicated or unexpected packaged notices');
 for (const notice of details.notices) {
  assert.match(notice.sourceSha256, /^[a-f0-9]{64}$/);
  assert.equal(notice.sourceSha256, notice.packagedSha256, 'Packaged notice differs: ' + notice.path);
 }
 return details;
}

export async function inspectIosArchive(mobileRoot, archive) {
 const root = path.resolve(mobileRoot), archivePath = path.resolve(archive);
 const config = JSON.parse(await fs.readFile(path.join(root, 'capacitor.config.json'), 'utf8'));
 const nativeSources = JSON.parse(await fs.readFile(path.join(root, 'licenses/native-sources.json'), 'utf8'));
 const expected = {
  appId: config.appId,
  build: readBuildVersion(await fs.readFile(path.join(root, '../dist/js/app-release.js'), 'utf8')),
  frameworks: Object.keys(nativeSources.swift.binaries)
 };
 const applications = path.join(archivePath, 'Products/Applications');
 const appNames = (await fs.readdir(applications)).filter(name => name.endsWith('.app'));
 assert.equal(appNames.length, 1, 'Expected exactly one app in the archive');
 const appPath = path.join(applications, appNames[0]);
 const widgetPath = path.join(appPath, 'PlugIns/SalahPrayerWidget.appex');
 const plist = (directory, key) => execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print :' + key, path.join(directory, 'Info.plist')], {encoding: 'utf8'}).trim();
 const describeBinary = async file => ({
  architectures: execFileSync('/usr/bin/lipo', ['-archs', file], {encoding: 'utf8'}).trim().split(/\s+/),
  binarySha256: sha256(await fs.readFile(file))
 });
 const describe = async directory => {
  const executable = plist(directory, 'CFBundleExecutable');
  assert.ok(executable && !['.', '..'].includes(executable) && !executable.includes('/') && !executable.includes('\\'), 'Invalid bundle executable');
  return {
   bundleId: plist(directory, 'CFBundleIdentifier'),
   build: plist(directory, 'CFBundleVersion'),
   version: plist(directory, 'CFBundleShortVersionString'),
   platform: plist(directory, 'DTPlatformName'),
   sdk: plist(directory, 'DTSDKName'),
   appGroup: plist(directory, 'SALAHAppGroup'),
   ...await describeBinary(path.join(directory, executable))
  };
 };
 const app = await describe(appPath), widget = await describe(widgetPath);
 widget.extensionPoint = plist(widgetPath, 'NSExtension:NSExtensionPointIdentifier');
 const frameworks = [];
 for (const name of expected.frameworks) {
  assert.match(name, /^[A-Za-z][A-Za-z0-9_-]*$/, 'Invalid framework name');
  frameworks.push({name, ...await describeBinary(path.join(appPath, 'Frameworks', name + '.framework', name))});
 }
 const notices = [];
 for (const relative of nativeNoticePaths) {
  const original = await fs.readFile(path.join(root, 'www', relative));
  const packaged = await fs.readFile(path.join(appPath, 'public', relative));
  notices.push({path: relative, sourceSha256: sha256(original), packagedSha256: sha256(packaged)});
 }
 const details = {app, widget, frameworks, packagedWebBuild: readBuildVersion(await fs.readFile(path.join(appPath, 'public/js/app-release.js'), 'utf8')), notices};
 validateIosArchive(details, expected);
 const report = {
  schemaVersion: 1,
  scope: 'Actual unsigned iPhone Release archive; arm64 app, WidgetKit and native frameworks; shared build version; Info.plist App Group configuration; packaged notices. Excludes signed entitlements, physical device behavior and store authorization.',
  sourceCommit: process.env.GITHUB_SHA || null,
  build: expected.build,
  archive: details,
  signingVerified: false,
  testFlightUploadReady: false,
  status: 'unsigned-device-archive-verified',
  remaining: ['Apple Developer membership and distribution signing', 'App Store Connect record and TestFlight upload', 'Physical iPhone/iPad testing', 'Native notification/audio integration and privacy review']
 };
 const output = path.join(root, 'reports/ios-device-preflight.json');
 await fs.mkdir(path.dirname(output), {recursive: true});
 await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
 console.log('PASS: actual unsigned arm64 iPhone Release archive, WidgetKit, native frameworks and packaged notices; build ' + expected.build + '. Signing and physical device testing remain pending.');
 return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 assert.ok(process.argv[2], 'Pass an .xcarchive path');
 await inspectIosArchive(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), process.argv[2]);
}
