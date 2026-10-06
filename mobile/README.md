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
4. Run `npm ci --ignore-scripts`.
5. Run `npm run sync:web`.
6. First Android setup: `npm run android:add`.
7. Sync future web changes: `npm run android:sync`.
8. Open Android Studio: `npm run android:open`.

Do not commit signing passwords, keystores, service-role keys or store credentials.

## iOS development

The shared mobile foundation is prepared here from Windows, but Xcode/WidgetKit compilation, signing and TestFlight require macOS. We can use a Mac or a controlled cloud Mac when the iOS target is ready.

First iOS setup on macOS:

1. `gem install xcodeproj -v 1.27.0 --user-install --no-document`
2. `npm ci --ignore-scripts`
3. `npm run sync:web`
4. `npm run ios:add`
5. `npm run ios:sync`
6. `npm run ios:open`

The iOS generator now creates and embeds the real WidgetKit target. Simulator compilation is checked in GitHub Actions from a Windows-led workflow; device signing and TestFlight still require an Apple Developer team.

## Widget plan

First release:

- Small widget: next prayer, prayer time, time remaining.
- Medium widget: next prayer plus all five prayer times.
- Android: native home-screen widget is wired through AppWidget + the `SalahWidget` Capacitor bridge. The same responsive layout covers small and medium widths.
- iOS: real WidgetKit small and medium widgets are generated and embedded, using the same snapshot contract and App Group storage.

Both platforms consume the same versioned prayer snapshot contract in `shared/prayer-widget.schema.json`.

## Privacy rule for native widgets

The widget snapshot may contain only the minimum needed to render prayer times:

- city display name;
- timezone;
- prayer calculation metadata;
- a bounded future prayer schedule;
- Hijri date metadata when available.

It must not contain prayer completion history, adhkar counters, Quran reading history, bookmarks, account tokens, email addresses, precise GPS coordinates or support messages.

## Android update verification

The generated project takes versionCode and versionName from the current SALAH web release. Each debug build uploads a separate APK report with application ID, verified signing certificate SHA-256, versionCode, APK checksum and source commit. Debug keys are generated per CI runner; a new artifact may have a different certificate from an already installed APK. The report does not authorize installation until the installed package certificate and version are compared. Use the original signing key for incompatible signatures; never remove the installed app to bypass the mismatch.

## Dependency and license evidence

`package-lock.json` fixes the complete npm dependency graph; CI uses `npm ci --ignore-scripts` so unreviewed lifecycle scripts cannot run and dependency drift cannot silently change a build. The Capacitor version remains 8.5.2.

`npm run licenses:report` records installed package versions, registry integrity, declared licenses and the SHA-256 of bundled license/notice files. It also handles complete license sections shipped in README and UNLICENSE files. Generated evidence stays in ignored `mobile/reports/` and is uploaded with Android and iOS CI builds.

`sync:web` validates this evidence before replacing `www`, preserves the existing core notice, and packages complete Capacitor core/Android/iOS notices in `www/third-party/Capacitor-NOTICES.txt`. Missing required notices or versions that disagree with the lockfile stop the build.

This evidence covers npm components only. Android Maven dependencies, resolved Swift packages, Ruby build tools and the application's images, text, audio and service permissions require separate review before a store release. The inventory does not grant a license to SALAH as a whole.
