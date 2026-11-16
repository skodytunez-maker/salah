# Confirmed counter transport

The optional fast channel transfers measured, competition-eligible cumulative
highwaters. It never derives seconds from playback presence, a timer, visibility,
the absence of touches, or another person's online state.

`action: 'progress'` accepts the existing device UUID, `totals`, `days` and
`timeZone` shapes, bounded to four changed reciters and two day buckets. Guests
also prove the existing secret and may send their known `creditRevision`.
`resumeCredit` is accepted only by the existing full-snapshot route.

Fast transfer requires a successfully acknowledged full baseline advertising
`progressVersion: 1`. An uninitialized device gets `accepted: false, needsFull:
true`. Registering a guest may advertise the capability but is not a baseline.
Normal success returns `accepted: true, needsFull: false`. Legacy full snapshots
continue to reconcile history and transfer a claimed guest once.

The new private server-time balance is shared by fast and full writes across all
reciters for each device. Server elapsed time refills it, and actual monotonic
growth spends it. Initial tolerance is granted once: 120 seconds for an account
device and 10 seconds for a guest, not once per HTTP request. Existing first-full
account history import semantics remain; an empty request cannot establish a
new import baseline. Guest creation-time/lifetime and merged-day bounds remain.
The account's full-sync timestamp is independent of fast ledger writes, retaining
the ten-second full-sync floor without starving recovery after fast updates.

Fast requests have dedicated limits: 90 per device per minute, at least 750 ms
between accepted attempts, and global windows of 12,000/minute and 1,200,000/day.
They do not consume the presence/registration channel's separate allowance.
Invalid guest secrets still consume the bounded global fast window; unknown
account devices share one account-specific initialization request bucket.
All new tables use private-schema RLS, restricted grants and account/guest
deletion cascades. No new client authority, JWT cache or identity is introduced.

The account route keeps its existing verified JWT, Auth user and live-session
checks. It skips identity initialization, own-award reads and global
favorite/rank/notification refresh for fast points. Full recovery retains those
existing operations. The guest route keeps its secret, claim lock, hold triggers,
exclusion offsets and ordered control revision.

A matching, unheld guest control gets a compact acknowledgment and a newer
revision. This acknowledgment advances only the client's revision fence; it must
not replace the persistent paired credit/raw baseline. A paused, newly discovered
or changed control instead returns `needsFull` with the complete credited view
and exact server raw anchors. No fast credit or resume occurs in that branch.
Only the full route can acknowledge a resume. Old full replies cannot replace a
newer fast control fence.

`GET ?live=1&day=...&period=...&mode=total|favorite` returns only public IDs,
public visibility mode, guest flags, numeric reciter totals/ranks, the independent
headphones freshness and whole all-reciter aggregate. Names, photos, private IDs
and geography are absent. Full boards and the thin feed return a safe-integer
SQL statement timestamp in microseconds as `revision`; each revision and its
numbers come from the same SQL snapshot. Row ordering is compared per
day/period/mode, while the mode-independent aggregate may share a day/period
revision fence.

The existing 1,000-row cap remains explicit through `limited`. Thin responses
are additionally bounded to 128 reciters per row and 512 KiB. Unexpected excess
returns `live_resource_limit` with HTTP 503, never a fabricated complete result.
An in-flight deduplicator and 750 ms bounded per-isolate cache reduce duplicate
queries. Cache age uses a monotonic clock. A cached result retains its original
revision and adds no elapsed time.

One-second transport is best effort. Network delay, old clients, an unavailable
server and suspended background JavaScript can delay new confirmations. Clients
hold the last confirmed foreign numbers, stop polling hidden/unmounted screens,
discard stale scopes/revisions and back off on failures. These limitations do not
alter stored listening time, award eligibility, or the separate playback signal.

If the dedicated fast budget is exhausted, bounded backoff stops constant failed
retries and the existing full synchronization remains the recovery path. Saved
measured seconds are not lost or filled in by a viewer timer. In particular,
older producers still sending every 15 seconds cannot supply genuinely fresh
one-second confirmations, even when the viewer has updated. Existing guest
full-sync/presence budgets are not expanded by this change; their current limits
can independently delay recovery and must not be described as guaranteed delivery.

Deploy the private migration before either new Edge bundle, verify both bundle
versions, and only then publish clients advertising/using the fast capability.
No migration invokes the award finalizer or repairs an award.
