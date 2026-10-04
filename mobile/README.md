# SALAH Mobile

This folder is the native shell for the existing SALAH web/PWA product.

## Direction

- Keep the existing SALAH web product as the shared UI and product core.
- Package it with Capacitor for Android and iOS.
- Add native capabilities only where the operating system provides clear value:
  - home-screen widgets;
  - native prayer notifications;
  - more reliable compass/orientation access;
  - platform share/install behavior;
  - background refresh for widget data.
- Keep worship history, Quran bookmarks, account tokens and other private user data out of widget shared storage.

## Working identifiers

- App name: `SALAH`
- Working bundle/application ID: `com.saadikobilov.salah`

The application ID can still be changed before store registration, but after public release it should be treated as permanent.

## Windows development

Android can be developed and built on Windows.

1. Install a current LTS Node.js release.
2. Install Android Studio with the Android SDK.
3. Open a terminal in `mobile`.
4. Run `npm install`.
5. Run `npm run sync:web`.
6. First Android setup: `npm run android:add`.
7. Sync future web changes: `npm run cap:sync`.
8. Open Android Studio: `npm run android:open`.

Do not commit signing passwords, keystores, service-role keys or store credentials.

## iOS development

The shared mobile foundation is prepared here from Windows, but Xcode/WidgetKit compilation, signing and TestFlight require macOS. We can use a Mac or a controlled cloud Mac when the iOS target is ready.

First iOS setup on macOS:

1. `npm install`
2. `npm run sync:web`
3. `npm run ios:add`
4. `npm run cap:sync`
5. `npm run ios:open`

## Widget plan

First release:

- Small widget: next prayer, prayer time, time remaining.
- Medium widget: next prayer plus all five prayer times.
- Android: native AppWidget/Glance layer.
- iOS: WidgetKit layer.

Both platforms consume the same versioned prayer snapshot contract in `shared/prayer-widget.schema.json`.

## Privacy rule for native widgets

The widget snapshot may contain only the minimum needed to render prayer times:

- city display name;
- timezone;
- prayer calculation metadata;
- a bounded future prayer schedule;
- Hijri date metadata when available.

It must not contain prayer completion history, adhkar counters, Quran reading history, bookmarks, account tokens, email addresses, precise GPS coordinates or support messages.
