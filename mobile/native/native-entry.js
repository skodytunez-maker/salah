import {Capacitor, registerPlugin} from './vendor/capacitor-core.js';

if (Capacitor.isNativePlatform()) {
  Capacitor.Plugins ??= {};

  if (Capacitor.isPluginAvailable('SalahWidget')) {
    Capacitor.Plugins.SalahWidget = registerPlugin('SalahWidget');
  }

  if (Capacitor.isPluginAvailable('LocalNotifications')) {
    Capacitor.Plugins.LocalNotifications = registerPlugin('LocalNotifications');
  }
}

await import('./app.js');
