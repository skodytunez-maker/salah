import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import vm from 'node:vm';
import {buildPrayerWidgetSnapshot} from '../dist/js/native-widget.js';

const root = new URL('../', import.meta.url);
const read = name => readFile(new URL(name, root), 'utf8');

const [view, model, store, plugin, controller, configure, entry, workflow, packageText] = await Promise.all([
  read('mobile/native/ios/SalahPrayerWidget.swift'),
  read('mobile/native/ios/PrayerWidgetModel.swift'),
  read('mobile/native/ios/PrayerWidgetStore.swift'),
  read('mobile/native/ios/SalahWidgetPlugin.swift'),
  read('mobile/native/ios/SalahBridgeViewController.swift'),
  read('mobile/scripts/configure-ios.rb'),
  read('mobile/native/native-entry.js'),
  read('.github/workflows/ios-debug.yml'),
  read('mobile/package.json')
]);

assert.match(view, /supportedFamilies\(\[\.systemSmall, \.systemMedium\]\)/);
assert.match(view, /Text\(\s*timerInterval:/);
assert.doesNotMatch(view, /Timer\.scheduledTimer|URLSession|\.systemLarge/);
assert.match(view, /snapshot: \$0 < snapshot\.expiresAt \? snapshot : nil/);
assert.match(model, /maximumDays = 14/);
assert.match(store, /forSecurityApplicationGroupIdentifier/);
assert.match(store, /\.atomic, \.completeFileProtectionUntilFirstUserAuthentication/);
assert.doesNotMatch(store, /UserDefaults|localStorage|URLSession/);
assert.match(plugin, /CAPBridgedPlugin/);
assert.match(plugin, /PrayerWidgetSnapshot\.decode/);
assert.match(controller, /registerPluginInstance\(SalahWidgetPlugin\(\)\)/);
assert.match(configure, /Embed App Extensions/);
assert.match(configure, /com\.apple\.security\.application-groups/);
assert.match(workflow, /SalahPrayerWidget\.appex/);
assert.ok(JSON.parse(packageText).scripts['ios:sync'].includes('ios:configure'));

for (const [native, available] of [[true, true], [true, false], [false, false]]) {
  const order = [];
  const proxy = {updateSnapshot() {}, clearSnapshot() {}};
  const Capacitor = {
    isNativePlatform: () => native,
    isPluginAvailable: () => available
  };
  const context = vm.createContext({
    Capacitor,
    registerPlugin: name => {
      assert.ok(['SalahWidget','LocalNotifications'].includes(name));
      order.push('register:'+name);
      return proxy;
    },
    boot: () => {
      order.push('boot');
      if (native && available) {
        assert.equal(Capacitor.Plugins.SalahWidget, proxy);
        assert.equal(Capacitor.Plugins.LocalNotifications, proxy);
      }
    }
  });

  vm.runInContext(
    entry
      .replace(/^import .*;$/m, '')
      .replace("await import('./app.js');", 'boot();'),
    context
  );

  assert.deepEqual(order, native && available ? ['register:SalahWidget','register:LocalNotifications','boot'] : ['boot']);
}

const base = Date.parse('2026-10-04T00:00:00+05:00');
const keys = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const days = {'2026-10-04': {}, '2026-10-05': {}};

const snapshot = buildPrayerWidgetSnapshot({
  city: {name: 'Тюмень', timezone: 'Asia/Yekaterinburg'},
  method: 3,
  school: 1,
  startDay: '2026-10-04',
  days,
  generatedAt: Date.parse('2026-10-04T07:00:00Z'),
  timingsFor: date => Object.hasOwn(days, date)
    ? Object.fromEntries(keys.map((key, i) => [
        key,
        base + (date === '2026-10-05' ? 86400000 : 0) + [5, 13, 16, 19, 21][i] * 3600000
      ]))
    : null
});

assert.equal(snapshot.days.length, 2);

const index = process.argv.indexOf('--fixture');
if (index !== -1) {
  assert.ok(process.argv[index + 1]);
  await writeFile(process.argv[index + 1], JSON.stringify(snapshot));
}

console.log('PASS: WidgetKit small/medium wiring, native registration before app startup and actual JS/Swift fixture export.');
