# Calendar leader scoring

Weekly and monthly calendar awards use the sum of the participant's reconciled,
eligible scores across all reciters, matching the default clock view of Top SALAH.
The heart view continues to rank the participant's favorite reciter separately.

The defect was in the calendar finalizer: it called the favorite-reciter board.
A listener with 600 seconds for one reciter could beat a listener with 500 seconds
for each of two reciters despite the latter leading the total-time board.

`20261116132745_calendar_awards_total_ranking.sql` adds a private, stable,
security-invoker aggregation helper and changes only the board called by the
existing finalizer. The representative reciter remains the highest personal
score, with the existing saved-favorite and reciter-ID tie breakers. The awarded
seconds are the combined total, not that representative reciter's score.

Existing participation, hidden-profile, confirmed-account and non-anonymous
account checks remain. Guests without a registered account are not newly added
to account awards. Total-time ties still award every first-place account; the
separate current-title selector is unchanged.

The helper and the current total Top both consume the same
`public.competition_scores(period, day)` reconciliation and require participation
enabled, visibility `initial` or `profile`, a confirmed account and a
non-anonymous Auth account. Neither ranking predicate adds a `banned_until`
filter; the existing live-headphones subquery checks that separately. This fix
does not change that policy or equate playback presence with eligible credit.

Moscow calendar boundaries, the finalizer's transaction lock, one-time period
closing, late-upload behavior, notification queues, streak reserves/refills,
milestones, founders and listening ledgers are unchanged. The migration neither
calls the finalizer nor rewrites an existing award. Any historical correction
must be reviewed separately for its exact award and period.

`tests/awards/check-database.cjs` runs the actual PostgreSQL functions and Edge
award queries. It covers different total/favorite winners, representative
selection, total-time ties, weekly and monthly midnight boundaries, eligibility,
replay identity, anonymous display, private helper grants, unchanged queues and
the existing streak/milestone/account-deletion checks.
