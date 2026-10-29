# iPhone pause/resume correction

Explicit pause previously restored navigator.audioSession.type to auto while keeping the native audio element and MediaSession handlers. Keep playback category only when an existing non-loading track remains paused. Playback intent and interruption recovery are cleared immediately, so visibility/focus cannot start sound after user pause. Stop, end, error and destroy release ownership; stale owners cannot clear replacements. Loading cancellation does not retain an empty session.

Regression: hidden standalone page, system-category-gated remote pause/play, same element and position, no automatic resume and category cleanup on stop. Existing interruption, source handoff and ambient priority checks remain. Physical iPhone Control Center acceptance is required after release; tests do not establish all iOS routing behavior. Saba source-noise investigation and portrait candidate are excluded.
