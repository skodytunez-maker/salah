import {Capacitor, registerPlugin} from './vendor/capacitor-core.js';

if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('SalahWidget')) {
  const widget = registerPlugin('SalahWidget');
  Capacitor.Plugins ??= {};
  Capacitor.Plugins.SalahWidget = widget;
}

const updater = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('SalahLiveUpdate') ? registerPlugin('SalahLiveUpdate') : null;
if(updater){Capacitor.Plugins ??= {};Capacitor.Plugins.SalahLiveUpdate=updater;}
await import('./app.js');
if(updater){
  const {APP_VERSION}=await import('./app-release.js');
  // Confirm only after the application module has actually booted.
  await updater.ready({version:APP_VERSION}).catch(()=>{});
}

