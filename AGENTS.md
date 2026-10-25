# SALAH product requirements

- Public release notes must show feature-specific pictures with short explanations in the existing gallery. This is a standing user preference. Do not substitute a generic book, star, or play icon for the feature illustration.
- A new announcement must include only newly introduced changes and feature-specific pictures for that edition. Do not append older reciter, Qibla or other previously announced cards. Preserve cards only within the same current edition. Keep acknowledgement and expiry unchanged for minor fixes. Update docs/release-announcements.md and use release-artwork validation.
- Minor fixes keep the current announcement identifier and expiry. After «Понятно», Home news stays dismissed for that announcement; Menu may reopen it. Do not reset acknowledgement for cosmetic changes.
- Before publishing, run scripts/check-release-illustrations.mjs. Every current public change must be assigned to appropriate feature artwork; add artwork for an unsupported feature.

- Do not announce subscriptions, monthly financial support, billing or the YooKassa review/cancellation flow in public news until the user explicitly asks to announce them. This includes current, waiting-update and legacy release cards. Preserve the private review link and payment UI.
