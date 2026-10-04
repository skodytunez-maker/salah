import {Capacitor, registerPlugin} from './vendor/capacitor-core.js';

if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('SalahWidget')) {
  const widget = registerPlugin('SalahWidget');
  Capacitor.Plugins ??= {};
  Capacitor.Plugins.SalahWidget = widget;
}

await import('./app.js');
