import assert from 'node:assert/strict';
import {nativeNoticePaths, readBuildVersion, validateIosArchive} from '../scripts/inspect-ios-archive.mjs';

const fingerprint = 'a'.repeat(64);
const expected = {appId: 'com.saadikobilov.salah', build: '221', frameworks: ['Capacitor', 'Cordova']};
const binary = {architectures: ['arm64'], binarySha256: fingerprint};
const valid = {
 app: {...binary, bundleId: expected.appId, build: '221', version: '1.0', platform: 'iphoneos', sdk: 'iphoneos26.0', appGroup: 'group.' + expected.appId},
 widget: {...binary, bundleId: expected.appId + '.prayerwidget', build: '221', version: '1.0', platform: 'iphoneos', sdk: 'iphoneos26.0', appGroup: 'group.' + expected.appId, extensionPoint: 'com.apple.widgetkit-extension'},
 frameworks: expected.frameworks.map(name => ({...binary, name})),
 packagedWebBuild: '221',
 notices: nativeNoticePaths.map(path => ({path, sourceSha256: fingerprint, packagedSha256: fingerprint}))
};
validateIosArchive(valid, expected);
assert.equal(readBuildVersion('export const APP_VERSION=221;'), '221');
for (const source of [
 'export const APP_VERSION=0;',
 'export const APP_VERSION="221";',
 'export const APP_VERSION=9007199254740992;'
]) assert.throws(() => readBuildVersion(source), /Invalid SALAH build version/);

const failures = [
 [value => {value.app.platform = 'iphonesimulator'}, /device archive/],
 [value => {value.widget.platform = 'iphonesimulator'}, /device WidgetKit/],
 [value => {value.widget.sdk = 'iphonesimulator26.0'}, /device SDK/],
 [value => {value.app.bundleId = 'another.app'}, /application ID/],
 [value => {value.widget.bundleId = 'another.widget'}, /WidgetKit ID/],
 [value => {value.app.build = '220'}, /Application build is stale/],
 [value => {value.widget.build = '220'}, /Widget build is stale/],
 [value => {value.packagedWebBuild = '220'}, /Packaged web release is stale/],
 [value => {value.app.appGroup = 'group.another.app'}, /App Group configuration/],
 [value => {value.widget.appGroup = 'group.another.app'}, /Widget App Group mismatch/],
 [value => {value.app.version = 'beta'}, /marketing version/],
 [value => {value.widget.version = '2.0'}, /marketing versions differ/],
 [value => {value.widget.extensionPoint = 'another.extension'}, /WidgetKit extension/],
 [value => {value.notices.pop()}, /packaged notices/],
 [value => {value.notices[1] = structuredClone(value.notices[0])}, /packaged notices/],
 [value => {value.notices[0].path = 'other-notice'}, /packaged notices/],
 [value => {value.notices[0].packagedSha256 = 'b'.repeat(64)}, /Packaged notice differs/],
 [value => {value.widget.binarySha256 = ''}, /binary fingerprint/],
 [value => {value.app.architectures = ['x86_64']}, /contain arm64/],
 [value => {value.widget.architectures = ['arm64', 'x86_64']}, /Unexpected device binary architecture/],
 [value => {value.frameworks.pop()}, /native frameworks/],
 [value => {value.frameworks[1].name = 'Capacitor'}, /native frameworks/],
 [value => {value.frameworks[0].architectures = ['x86_64']}, /contain arm64/],
 [value => {value.frameworks[0].binarySha256 = ''}, /binary fingerprint/]
];
for (const [mutate, message] of failures) {
 const changed = structuredClone(valid);
 mutate(changed);
 assert.throws(() => validateIosArchive(changed, expected), message);
}
console.log('PASS: iPhone archive validator rejects ' + failures.length + ' invalid archives, including stale versions, simulator binaries, missing frameworks, wrong App Groups and replaced/duplicated notices.');
