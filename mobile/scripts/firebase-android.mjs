import fs from 'node:fs/promises';
import path from 'node:path';
export function validateFirebaseConfig(value,packageName){
 if(value?.project_info?.project_id!=='salah-8b73f'||String(value.project_info.project_number)!=='305914198771'||JSON.stringify(value).includes('private_key'))throw Error('Unexpected Firebase project or server credential');
 const clients=value.client?.filter(client=>client.client_info?.android_client_info?.package_name===packageName);
 if(clients?.length!==1||clients[0].client_info.mobilesdk_app_id!=='1:305914198771:android:fd81d98ec02057836a1586'||!clients[0].api_key?.some(key=>/^AIza[\w-]{35}$/.test(key.current_key||'')))throw Error('Firebase configuration does not match SALAH APK');
 return {...value,client:clients};
}
export async function configureFirebaseAndroid(mobileRoot,packageName){
 const raw=await fs.readFile(path.join(mobileRoot,'native','android','google-services.json'),'utf8');
 const config=validateFirebaseConfig(JSON.parse(raw.replace(/^\uFEFF/,'')),packageName);
 await fs.writeFile(path.join(mobileRoot,'android','app','google-services.json'),JSON.stringify(config,null,2));
 const gradlePath=path.join(mobileRoot,'android','app','build.gradle');
 let gradle=await fs.readFile(gradlePath,'utf8');
 gradle=gradle.replace(/\n\/\/ SALAH_FIREBASE_BEGIN[\s\S]*?\/\/ SALAH_FIREBASE_END\n?/g,'\n');
 gradle+='\n// SALAH_FIREBASE_BEGIN\napply plugin: "com.google.gms.google-services"\ndependencies { implementation "com.google.firebase:firebase-messaging:26.0.0" }\n// SALAH_FIREBASE_END\n';
 await fs.writeFile(gradlePath,gradle);
 const nativeRoot=path.join(mobileRoot,'native','android');
 const javaRoot=path.join(mobileRoot,'android','app','src','main','java',...packageName.split('.'));
 await fs.mkdir(javaRoot,{recursive:true});
 for(const name of ['SalahSupportPushPlugin.java','SalahSupportMessagingService.java'])await fs.copyFile(path.join(nativeRoot,name),path.join(javaRoot,name));
 const drawable=path.join(mobileRoot,'android','app','src','main','res','drawable');await fs.mkdir(drawable,{recursive:true});
 await fs.copyFile(path.join(nativeRoot,'salah_notification.xml'),path.join(drawable,'salah_notification.xml'));
 const manifestPath=path.join(mobileRoot,'android','app','src','main','AndroidManifest.xml');
 let manifest=await fs.readFile(manifestPath,'utf8');
 // No registration or permission request until the user enables support alerts.
 if(!manifest.includes('firebase_messaging_auto_init_enabled'))manifest=manifest.replace('</application>','<meta-data android:name="firebase_messaging_auto_init_enabled" android:value="false" />\n</application>');
 if(!manifest.includes('android.permission.POST_NOTIFICATIONS'))manifest=manifest.replace('<application','<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n<application');
 if(!manifest.includes('.SalahSupportMessagingService'))manifest=manifest.replace('</application>','<service android:name=".SalahSupportMessagingService" android:exported="false"><intent-filter><action android:name="com.google.firebase.MESSAGING_EVENT" /></intent-filter></service>\n</application>');
 await fs.writeFile(manifestPath,manifest);
}
