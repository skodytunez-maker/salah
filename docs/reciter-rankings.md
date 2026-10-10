
# Reciter rankings and optional listener identity

Personal totals stay device-local and account-scoped. Today, Monday-based week, calendar month and all time are supported. Legacy undated totals remain in all time. New progress is split at midnight and retained by date for 93 days. Pause/seek/stalled audio are not credited.

The community ranking uses accepted, opted-in listening minutes from confirmed users. The public periods are today UTC, the last 7 days, and the last 30 days. Minutes determine order; equal time shares places. The main screen shows up to five reciters, with the first three on a podium. The full list opens separately.

Existing minute reports remain compatible. Event IDs are idempotent, contribution frequency is limited to one accepted report per 55 seconds, and the cap is 120 minutes per account/day. Aggregated records are retained for 30 days; this is an interest ranking rather than a fraud-proof billing meter.

Listener visibility defaults to hidden and is separate from minute-report participation. Users can display a full nickname and optional photo, or use anonymous initials. Switching from anonymous to full identity requires an explicit UI confirmation. In anonymous mode both the nickname and photo are excluded by the server serializer; only one letter is shown, or two when distinct visible listeners share the first letter. The same account appearing under several reciters does not cause a false collision.

The visibility table has RLS enabled and no direct anon/authenticated grants. All preference changes use verified confirmed Auth users and bind writes to their own UID. Public IDs are random and rotate on visibility-mode changes. Account deletion cascades visibility records.

The avatar bucket remains private. A public proxy serves the processed JPEG only for a currently opted-in profile with recent listening and a confirmed non-anonymous account. Hidden or anonymous profiles cannot use the proxy. Responses are no-store; no Auth UID, email, JWT, original filename or EXIF is sent in ranking data. The photo remains in the user's own private account when anonymity is enabled.

Photo/name UI tests use invented local fixture data. No real account was made public and no personal photo was uploaded during testing. Icons come from Font Awesome Free 6.7.2, with notices and sources bundled.


Release 281: signed-in accounts count new playback automatically, unless their account-scoped setting explicitly disables counting. Guests do not send reports. On the first accepted minute, missing listener preferences are enrolled with initials only; existing hidden, anonymous or public preferences are preserved. Nickname/photo publication still needs explicit in-app confirmation. Extra seconds preserve approved one-time corrections; reports remain whole minutes.
