import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const base=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,base),'utf8');

const [provider,plugin,activity,layout,info,config,workflow,pkg,bridge]=await Promise.all([
  read('mobile/native/android/SalahPrayerWidgetProvider.java'),
  read('mobile/native/android/SalahWidgetPlugin.java'),
  read('mobile/native/android/MainActivity.java'),
  read('mobile/native/android/salah_widget.xml'),
  read('mobile/native/android/salah_widget_info.xml'),
  read('mobile/scripts/configure-android.mjs'),
  read('.github/workflows/android-debug.yml'),
  read('mobile/package.json'),
  read('dist/js/native-widget.js')
]);
assert.match(provider,/class SalahPrayerWidgetProvider extends AppWidgetProvider/);
assert.match(provider,/OPTION_APPWIDGET_MIN_WIDTH/);
assert.match(provider,/>= 250/);
assert.match(provider,/Fajr.*Dhuhr.*Asr.*Maghrib.*Isha/s);
assert.match(provider,/System\.currentTimeMillis\(\)/);
assert.match(plugin,/@CapacitorPlugin\(name = "SalahWidget"\)/);
assert.match(plugin,/updateSnapshot/);
assert.match(plugin,/clearSnapshot/);
assert.match(activity,/registerPlugin\(SalahWidgetPlugin\.class\)/);
assert.match(layout,/@\+id\/widget_schedule/);
assert.match(layout,/@\+id\/widget_prayer/);
assert.match(info,/updatePeriodMillis="1800000"/);
assert.match(config,/SalahPrayerWidgetProvider/);
assert.match(config,/AndroidManifest\.xml/);
assert.match(workflow,/npm run android:configure/);
assert.match(pkg,/"android:configure"/);
assert.match(bridge,/Plugins\?\.SalahWidget/);
assert.ok(!plugin.includes('latitude')&&!plugin.includes('longitude'),'Native widget storage must not add precise coordinates.');
console.log('PASS: Android small/medium prayer widget, Capacitor bridge and generated-project configuration are wired.');
