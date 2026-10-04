# SALAH native shared contract

The native widget layer must not read the browser's internal storage directly.

The web app sends a small, versioned prayer snapshot to the native shell. Android and iOS store that snapshot in their platform-specific shared container and render widgets from it.

Rules:

1. Treat `schemaVersion` as a compatibility boundary.
2. Store no authentication credentials in the snapshot.
3. Store no worship history or personal religious activity.
4. Store only a bounded set of future days.
5. If the snapshot is missing or expired, widgets should show a neutral "Open SALAH to refresh" state rather than inventing prayer times.
6. Native code computes "next prayer" from absolute epoch-millisecond prayer timestamps in the snapshot.
