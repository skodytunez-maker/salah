// Location can use a manually selected city; recording is an optional action.
// Permission requests must not make this hardware mandatory for installation.
export const OPTIONAL_ANDROID_HARDWARE=Object.freeze(['android.hardware.location','android.hardware.location.gps','android.hardware.location.network','android.hardware.microphone']);
const declaration=feature=>new RegExp('<uses-feature\\b[^>]*\\bandroid:name=["\']'+feature.replaceAll('.','\\.')+'["\'][^>]*>','g');
export function configureOptionalAndroidHardware(manifest){
 if(!/<application\b/.test(manifest))throw Error('Android application element is missing');
 for(const feature of OPTIONAL_ANDROID_HARDWARE){
  const expression=declaration(feature);
  if(expression.test(manifest))manifest=manifest.replace(declaration(feature),tag=>/\bandroid:required\s*=/.test(tag)?tag.replace(/\bandroid:required\s*=\s*["'][^"']*["']/,'android:required="false"'):tag.replace(/\s*(\/?>)$/,' android:required="false" $1'));
  else manifest=manifest.replace(/<application\b/,'<uses-feature android:name="'+feature+'" android:required="false" />\n    <application');
 }
 return manifest;
}
export function verifyOptionalAndroidHardware(manifest){
 for(const feature of OPTIONAL_ANDROID_HARDWARE){const tags=[...manifest.matchAll(declaration(feature))];if(!tags.length||tags.some(([tag])=>!/\bandroid:required\s*=\s*["']false["']/.test(tag)))throw Error('Optional hardware declaration missing: '+feature);}
}
