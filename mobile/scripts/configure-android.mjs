import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {configureAndroidIcons} from './android-icons.mjs';
import {syncAndroidVersion} from './android-release.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const mobileRoot=path.resolve(here,'..');
const androidRoot=path.join(mobileRoot,'android','app','src','main');
const templateRoot=path.join(mobileRoot,'native','android');
const config=JSON.parse(await fs.readFile(path.join(mobileRoot,'capacitor.config.json'),'utf8'));
const packagePath=config.appId.split('.').join(path.sep);
const javaRoot=path.join(androidRoot,'java',packagePath);
const resRoot=path.join(androidRoot,'res');

async function copy(name,target){
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.copyFile(path.join(templateRoot,name),target);
}

try{await fs.access(androidRoot)}catch{
  throw new Error('Android project is missing. Run "npx cap add android" first.');
}

await copy('MainActivity.java',path.join(javaRoot,'MainActivity.java'));
await copy('SalahWidgetPlugin.java',path.join(javaRoot,'SalahWidgetPlugin.java'));
await copy('SalahPrayerWidgetProvider.java',path.join(javaRoot,'SalahPrayerWidgetProvider.java'));
await copy('SalahWidgetSizing.java',path.join(javaRoot,'SalahWidgetSizing.java'));
await copy('SalahWidgetDay.java',path.join(javaRoot,'SalahWidgetDay.java'));
for(const name of ['SalahReminderPlugin','SalahReminderStore','SalahReminderReceiver','SalahReminderPolicy','SalahAdhanService','SalahAdhanPolicy'])await copy(name+'.java',path.join(javaRoot,name+'.java'));
await copy('SalahAdhanPolicyTest.java',path.join(androidRoot,'..','test','java',packagePath,'SalahAdhanPolicyTest.java'));
await copy('SalahReminderPolicyTest.java',path.join(androidRoot,'..','test','java',packagePath,'SalahReminderPolicyTest.java'));
await copy('SalahWidgetSizingTest.java',path.join(androidRoot,'..','test','java',packagePath,'SalahWidgetSizingTest.java'));
await copy('salah_widget.xml',path.join(resRoot,'layout','salah_widget.xml'));
await copy('salah_widget_bg.xml',path.join(resRoot,'drawable','salah_widget_bg.xml'));
await copy('salah_notification.xml',path.join(resRoot,'drawable','salah_notification.xml'));
await copy('salah_widget_info.xml',path.join(resRoot,'xml','salah_widget_info.xml'));
await copy('widget_strings.xml',path.join(resRoot,'values','widget_strings.xml'));

const manifestPath=path.join(androidRoot,'AndroidManifest.xml');
let manifest=await fs.readFile(manifestPath,'utf8');
if(!manifest.includes('android.permission.CAMERA'))manifest=manifest.replace('<application','<uses-permission android:name="android.permission.CAMERA" />\n    <uses-feature android:name="android.hardware.camera" android:required="false" />\n    <application');
for(const permission of ['POST_NOTIFICATIONS','SCHEDULE_EXACT_ALARM','RECEIVE_BOOT_COMPLETED','FOREGROUND_SERVICE','FOREGROUND_SERVICE_MEDIA_PLAYBACK','WAKE_LOCK'])if(!manifest.includes('android.permission.'+permission))manifest=manifest.replace('<application','<uses-permission android:name="android.permission.'+permission+'" />\n    <application');
if(!manifest.includes('android:name=".SalahAdhanService"'))manifest=manifest.replace('</application>','<service android:name=".SalahAdhanService" android:exported="false" android:foregroundServiceType="mediaPlayback" />\n    </application>');
const reminderReceiver=`        <receiver android:name=".SalahReminderReceiver" android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
                <action android:name="android.intent.action.TIME_SET" />
                <action android:name="android.intent.action.TIMEZONE_CHANGED" />
                <action android:name="android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED" />
            </intent-filter>
        </receiver>
`;
if(!manifest.includes('android:name=".SalahReminderReceiver"'))manifest=manifest.replace('</application>',reminderReceiver+'    </application>');
const receiver=`        <receiver
            android:name=".SalahPrayerWidgetProvider"
            android:icon="@mipmap/salah_launcher"
            android:exported="false">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/salah_widget_info" />
        </receiver>
`;
if(!manifest.includes('android:name=".SalahPrayerWidgetProvider"')){
  if(!manifest.includes('</application>'))throw new Error('AndroidManifest.xml has no application element.');
  manifest=manifest.replace('</application>',receiver+'    </application>');
}
manifest=await configureAndroidIcons(mobileRoot,resRoot,manifest);
await fs.writeFile(manifestPath,manifest);

await syncAndroidVersion(mobileRoot);
console.log('SALAH Android native widget configured.');
