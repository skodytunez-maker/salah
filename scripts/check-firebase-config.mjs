import assert from 'node:assert/strict';
import{validateFirebaseConfig}from '../mobile/scripts/firebase-android.mjs';
const value={project_info:{project_id:'salah-8b73f',project_number:'305914198771'},client:[{client_info:{android_client_info:{package_name:'com.saadikobilov.salah'},mobilesdk_app_id:'1:305914198771:android:fd81d98ec02057836a1586'},api_key:[{current_key:'AIza'+'a'.repeat(35)}]}]};
assert.equal(validateFirebaseConfig(value,'com.saadikobilov.salah').client.length,1);
assert.throws(()=>validateFirebaseConfig(value,'salah.com'));
assert.throws(()=>validateFirebaseConfig({...value,private_key:'must-never-be-in-client'},'com.saadikobilov.salah'));
assert.throws(()=>validateFirebaseConfig({...value,project_info:{...value.project_info,project_id:'other'}},'com.saadikobilov.salah'));
assert.throws(()=>validateFirebaseConfig({...value,client:[...value.client,...value.client]},'com.saadikobilov.salah'));
console.log('PASS correct Firebase project/package; foreign, duplicate and server-secret configs rejected');
