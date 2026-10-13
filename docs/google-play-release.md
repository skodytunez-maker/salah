# SALAH — Google Play preparation

Version 331. Package remains com.saadikobilov.salah. Support: skodytunez@gmail.com, confirmed by the owner. Google Play Console account is not yet registered. This preparation does not claim an app-store upload or public approval.

## Prepared

- android-play.yml builds a real non-debuggable release AAB, runs release JVM tests, validates target SDK >=36 using pinned official bundletool 1.18.3, verifies embedded app version/native notices/privacy pages and uploads an explicitly unsigned artifact with fingerprints.
- Optional signing is a separate manual main-only job in environment google-play-upload. It verifies the upload certificate fingerprint, keeps secrets out of command lines, bundles and artifacts, cleans the temporary keystore, verifies the signed AAB, and outputs a separate signed artifact. Nothing is automatically submitted to Play.
- ru-RU.json contains title, short/full description and links. data-safety-draft.json records actual source evidence; it needs accurate owner responses in Play Console rather than blindly copying default checkboxes.
- Public privacy and account-deletion pages include the confirmed email; the deletion page supports an email request without reinstalling the app. In-app deletion keeps explicit confirmation and existing identity/session checks.

## Signing setup

Use an approved upload key created with Android Studio or keytool and backed up securely. In GitHub environment google-play-upload configure SALAH_UPLOAD_KEYSTORE_BASE64, SALAH_UPLOAD_KEY_ALIAS, SALAH_UPLOAD_STORE_PASSWORD, SALAH_UPLOAD_KEY_PASSWORD and SALAH_UPLOAD_CERT_SHA256. Require owner approval and restrict deployment branches to main. Do not paste key files, passwords or base64 into chat, commits, screenshots or logs. Run the workflow on main with sign_bundle=true only after configuring that environment. Unsigned artifacts are build evidence and are not ready to upload to Play.

The old installed debug APK signing key has not been recovered. An upload key and the Google Play app signing key are distinct; a newly signed Play build cannot be claimed as an in-place update of existing APKs unless the installed certificate is compatible. Do not uninstall user apps or rename the package to bypass this issue. Google's developer verification may require proof of ownership for a package previously distributed outside Play. Resolve this at registration before committing a permanent store identity.

## Remaining human and device steps

Register and verify the Play Console developer account; the owner handles identity, payment and terms. Create the SALAH app, review the intended audience/content questionnaire, supply reviewer access for account features without using owner/admin credentials, complete Data safety and permission declarations. Run the signed release on real Android phones: fresh account, session resume, Quran lock-screen playback, notification permissions, prayer reminders/azan while locked, offline files, widget resize and account deletion with a disposable test account. Capture real phone screenshots (no fabricated screens or personal profile data). Complete unresolved rights/permissions in the existing registers for bundled/audio/photo sources.

For a new personal account, use at least 12 real testers opted in continuously for 14 days before requesting production access. Keep test feedback and fix observed defects. Submission and review dates depend on Play; no guaranteed approval time.

Official sources: https://developer.android.com/studio/publish/app-signing ; https://developer.android.com/tools/bundletool ; https://developer.android.com/google/play/requirements/target-sdk ; https://support.google.com/googleplay/android-developer/answer/14151465 ; https://support.google.com/googleplay/android-developer/answer/13327111 .
