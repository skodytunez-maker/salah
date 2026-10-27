# Quran listening presence · 410

The Top SALAH headphones indicator reports advancing Quran playback for an enabled, visible public profile. It never derives listening from an app visit, cumulative minutes, or ruqyah playback. Hidden and initial-only profiles never expose this signal. Public responses contain only a bounded remaining lease, attached to the existing public ID; account, session and per-page IDs stay private.

The player emits at most one playing heartbeat per15seconds and clears the state on pause, failure, completion or page exit. No forward progress for20seconds clears it locally. A45second server lease tolerates missed network packets and expires on offline or frozen devices. The public board refresh interval can add its existing polling delay to a visible pause change. Background playback can keep the icon when the browser permits heartbeats; it expires safely when the browser freezes tasks.

The endpoint verifies the user with Auth, checks the bound active session again inside the transaction, validates strict packets, limits requests, and applies monotonic per-page sequences. Pause tombstones prevent delayed play packets from resurrecting the signal. Auth-session deletion cascades its rows. Both new tables have RLS and no browser grants or browser policies. No score, award or minute mutation is part of presence updates. Browser cache converts the lease to an absolute deadline at request start; reading it cannot revive the status.

The SVG `assets/updates/listener-presence-410.svg` is an original code illustration made for SALAH. It uses geometric ranking cards and the same outlined headphones motif as the UI. It embeds no third-party image.

Rollback: restore the pre410 competition frontend and reciter-competition function source from the409 commit using a higher frontend release number. The additive private tables can remain unused; do not reset scores, delete listening records, or downgrade the native updater. The local verification bundle also retains the live v18 Edge source before deployment.
