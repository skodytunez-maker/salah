import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {configureOptionalAndroidHardware,verifyOptionalAndroidHardware,OPTIONAL_ANDROID_HARDWARE} from '../mobile/scripts/android-optional-hardware.mjs';
const original='<manifest><uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/><uses-permission android:name="android.permission.RECORD_AUDIO"/><uses-feature android:name="android.hardware.camera" android:required="false"/><application><activity android:name=".MainActivity"/></application></manifest>';
assert.throws(()=>verifyOptionalAndroidHardware(original));
const configured=configureOptionalAndroidHardware(original);verifyOptionalAndroidHardware(configured);assert.equal(configureOptionalAndroidHardware(configured),configured);
for(const feature of OPTIONAL_ANDROID_HARDWARE){
 const required=configured.replace('android:name="'+feature+'" android:required="false"','android:name="'+feature+'" android:required="true"');
 assert.throws(()=>verifyOptionalAndroidHardware(required));assert.equal(configureOptionalAndroidHardware(required),configured);
 const implicit=configured.replace('android:name="'+feature+'" android:required="false"','android:name="'+feature+'"');assert.throws(()=>verifyOptionalAndroidHardware(implicit));verifyOptionalAndroidHardware(configureOptionalAndroidHardware(implicit));
}
assert.ok(configured.includes('<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>'));assert.ok(configured.includes('<uses-permission android:name="android.permission.RECORD_AUDIO"/>'));assert.ok(configured.includes('android.hardware.camera" android:required="false"'));assert.ok(configured.includes('<activity android:name=".MainActivity"/>'));
assert.throws(()=>configureOptionalAndroidHardware('<manifest/>'));
const native=await fs.readFile(new URL('../mobile/scripts/configure-android.mjs',import.meta.url),'utf8'),inspector=await fs.readFile(new URL('../mobile/scripts/inspect-android-bundle.mjs',import.meta.url),'utf8');assert.ok(native.includes('manifest=configureOptionalAndroidHardware(manifest)'));assert.ok(inspector.includes('verifyOptionalAndroidHardware(xml)'));
console.log('PASS: optional location/GPS/network/microphone, permission preservation, existing declarations, idempotence, and rejection of required hardware in the actual bundle inspector.');
