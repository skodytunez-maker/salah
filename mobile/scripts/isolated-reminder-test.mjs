import fs from 'node:fs/promises';
import path from 'node:path';
import{fileURLToPath}from 'node:url';
export async function prepareReminderTest(mobileRoot){
 const config=JSON.parse(await fs.readFile(path.join(mobileRoot,'capacitor.config.json'),'utf8'));if(config.appId!=='com.saadikobilov.salah')throw Error('Unexpected base application');
 const generated=path.join(mobileRoot,'android/app');const gradle=path.join(generated,'build.gradle');let code=await fs.readFile(gradle,'utf8');if(code.includes('SALAH_REMINDER_TEST'))throw Error('Test variant already prepared');
 code+='\n// SALAH_REMINDER_TEST: isolated installation, no replacement of user data.\nandroid { defaultConfig { applicationId "com.saadikobilov.salah.remindertest" } }\ntasks.matching { it.name.endsWith("GoogleServices") }.configureEach { enabled = false }\n';await fs.writeFile(gradle,code);
 const strings=path.join(generated,'src/main/res/values/strings.xml');let labels=await fs.readFile(strings,'utf8');if(!labels.includes('name="app_name"'))throw Error('Missing app label');labels=labels.replace(/(<string name="(?:app_name|title_activity_main)">)[^<]+/g,'$1SALAH Проверка');await fs.writeFile(strings,labels);
 const activity=path.join(generated,'src/main/java/com/saadikobilov/salah/MainActivity.java');let java=await fs.readFile(activity,'utf8');if(!java.includes('registerPlugin(SalahReminderPlugin.class)'))throw Error('Reminder plugin absent');java=java.replace(/\s*registerPlugin\(SalahSupportPushPlugin.class\);/,'');await fs.writeFile(activity,java);
 const manifest=path.join(generated,'src/main/AndroidManifest.xml');let xml=await fs.readFile(manifest,'utf8');xml=xml.replace(/(<service android:name="\.SalahSupportMessagingService")/,'$1 android:enabled="false"');await fs.writeFile(manifest,xml);
 return {applicationId:'com.saadikobilov.salah.remindertest',label:'SALAH Проверка',supportPush:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await prepareReminderTest(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'))));
