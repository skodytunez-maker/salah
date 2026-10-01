# SALAH visitor statistics

Status: enabled for production SALAH at https://salah-saadi.goatcounter.com. The owner supplied this site address on 2026-10-02. Dashboard access stays protected by the owner account.

1. Owner registers at https://www.goatcounter.com/signup and keeps the dashboard private. Use skodytunez-maker.github.io/salah/ as the site.
2. Set ANALYTICS_SITE in dist/js/analytics.js to the public site address, e.g. https://your-name.goatcounter.com (never an API token or password).
3. Publish, then open the production app and confirm the first visit in the owner's dashboard.
4. Dashboard counts visits using GoatCounter sessions, not verified individual people or installations. Different devices, blockers and offline use affect estimates; previous usage cannot be recovered.

Only the fixed /salah/ path and SALAH title are sent. No route, query, city, prayer mark, counter, bookmark or ayah is read. Referrer is empty. Analytics is off on localhost and all other hosts; Do Not Track is respected. Resume after 30 minutes in the background records another visit, deduplicated by the service. Failure to load the counter never blocks the app.

Source: https://www.goatcounter.com/help/js and https://www.goatcounter.com/help/sessions

## Owner dashboard inside SALAH

The private owner link https://skodytunez-maker.github.io/salah/#admin can show the GoatCounter dashboard in a frame. The owner cabinet is not listed in the public menu. This reuses the existing GoatCounter owner account; SALAH does not create its own user accounts or store passwords, API keys, roles, sessions or secret dashboard tokens. Merely visiting #admin does not grant access to statistics. Keep Dashboard viewable by logged in users only.

Owner must sign in to GoatCounter and allow https://skodytunez-maker.github.io in Settings → Sites that can embed GoatCounter. The external dashboard link is available if embedding is not configured or a phone browser blocks third-party login cookies. Cross-origin authentication state cannot be inspected by SALAH, so it must not claim successful login based on iframe load. No fake statistics or totals are rendered locally.

Source: https://www.goatcounter.com/help/frame

Removing the navigation entry only hides the shortcut; it is not an authorization check. The #admin login shell remains accessible by URL, while access to statistics is enforced by GoatCounter server authentication. SALAH cannot inspect the cross-origin provider session to identify the owner or show an owner-only menu. Do not store a local owner flag as authorization.
