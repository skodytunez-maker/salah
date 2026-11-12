# SALAH product requirements

- Public release notes must show feature-specific pictures with short explanations in the existing gallery. This is a standing user preference. Do not substitute a generic book, star, or play icon for the feature illustration.
- A new announcement must include only newly introduced changes and feature-specific pictures for that edition. Do not append older reciter, Qibla or other previously announced cards. Preserve cards only within the same current edition. Keep acknowledgement and expiry unchanged for minor fixes. Update docs/release-announcements.md and use release-artwork validation.
- Minor fixes keep the current announcement identifier and expiry. After «Понятно», Home news stays dismissed for that announcement; Menu may reopen it. Do not reset acknowledgement for cosmetic changes.
- Animated release cards use the shared `release-motion-preview` loop with `data-release-motion-part` for each moving element. Alternate directions while the active card is open, pause hidden cards, and respect reduced motion. In the installed news dialog, record acknowledgement only after «Понятно».
- Before publishing, run scripts/check-release-illustrations.mjs. Every current public change must be assigned to appropriate feature artwork; add artwork for an unsupported feature.

- Do not announce subscriptions, monthly financial support, billing or the YooKassa review/cancellation flow in public news until the user explicitly asks to announce them. This includes current, waiting-update and legacy release cards. Preserve the private review link and payment UI.

- A user's prayer city, country, and geography derived from user locations are private. Other users’ location and geography reports are visible only to the verified owner through owner-only endpoints with active session and MFA. A user may view or change their own prayer city. Public rankings, public profiles, staff and support views must not expose another user's location.

- Tafsir is temporarily removed from public use at the user's request. Do not restore public Tafsir entry points or promote its availability without an explicit new request.
- Deferred product ideas are recorded in docs/product-ideas.md; recording an idea does not authorize implementation.

- Home activity is anonymous for ordinary users: only aggregate listening, Quran reading and dhikr counts are public. Only the verified owner, through an endpoint requiring an active session and MFA, may open participant lists. Unregistered guests have no known name and must stay labelled as guests.
