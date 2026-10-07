import fs from 'node:fs/promises';
import path from 'node:path';
// Reuse the existing SALAH brand asset; generated Capacitor resources are disposable.
export async function configureAndroidIcons(mobileRoot,resRoot,manifest){
 const icon=await fs.readFile(path.resolve(mobileRoot,'../dist/icon-512.png'));
 if(icon.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||icon.readUInt32BE(16)!==512||icon.readUInt32BE(20)!==512)throw Error('Expected SALAH 512px PNG icon.');
 const write=async(file,content)=>{const target=path.join(resRoot,file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,content);};
 await write('mipmap-nodpi/salah_launcher.png',icon);
 await write('drawable-nodpi/salah_icon_bitmap.png',icon);
 await write('drawable/salah_icon_foreground.xml','<?xml version="1.0" encoding="utf-8"?>\n<bitmap xmlns:android="http://schemas.android.com/apk/res/android" android:src="@drawable/salah_icon_bitmap" android:gravity="fill" />\n');
 await write('drawable/salah_icon_background.xml','<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android"><solid android:color="#07101d" /></shape>\n');
 await write('mipmap-anydpi-v26/salah_launcher.xml','<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@drawable/salah_icon_background" /><foreground android:drawable="@drawable/salah_icon_foreground" /></adaptive-icon>\n');
 let replaced=false;
 const next=manifest.replace(/<application\b[^>]*>/,tag=>{replaced=true;return tag.replace(/\sandroid:(?:icon|roundIcon)="[^"]*"/g,'').replace(/>$/,' android:icon="@mipmap/salah_launcher" android:roundIcon="@mipmap/salah_launcher">');});
 if(!replaced)throw Error('Android manifest application element missing.');
 return next;
}
