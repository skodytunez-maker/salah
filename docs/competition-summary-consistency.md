# Consistent competition summary

The public board previously read fresh ranked rows alongside a shared summary cached for ten seconds. A response could therefore contain a 19-second participant and a 15-second overall total.

For the reciter-details response, compute the overall sum as a window aggregate over ranked participant totals in the same SQL statement, before the 1000-row limit. Return this sum through the existing listeningTotals field. Legacy/fallback responses read a fresh aggregate instead of a previous request's cache. No score, award, preference, authentication or schema mutation is added.

Regression coverage executes the real Edge handler and PostgreSQL queries: immediate consecutive requests, per-period totals, the 19/19 screenshot case, participants beyond the response cap, privacy removals, empty boards and legacy responses. Rollback restores only the previous reciter-competition handler; stored listening data is unaffected.
