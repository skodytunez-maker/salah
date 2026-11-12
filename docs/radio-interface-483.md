# SALAH 483 — radio interface

Owner requested removal of repeated prototype labels and a polished SALAH presentation. The radio header now has a scoped stacked layout, avoiding the global horizontal header rules that split it into three columns on iPhone. Home beacon, radio title, programme, quiz and navigation contain no repeated preview/demo labels. This changes presentation only: the owner/MFA checks are retained; no live broadcast, synthesized host, real participants or prize delivery is enabled or claimed.

Visited tabs retain their DOM, checked reciters and quiz state. The header/tab controls remain mounted; event handling is delegated once and removed on disposal. Switching tabs only changes visibility or refreshes a dirty active pane, without replaying generic card animations. Progress updates change the status and progress bar directly while preserving the tab controls. The build button immediately displays «Подбираем…», indicates busy state and exposes cancellation. Duplicate clicks do not start multiple scans. User confirmed existing programme selection eventually worked; the measured-duration algorithm and four initial reciters are unchanged.

No public news or server changes. Announcement479, expiry and acknowledgements are preserved. Test owner-only access, revocation, pending navigation, tab node identity, state retention, keyboard navigation, in-flight progress/tab switching, cancellation/retry and audition. Browser use is disabled in this environment; visual/touch verification on a physical iPhone remains after publication.

