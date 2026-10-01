# SALAH security review — 2026-10-02

Scope: published static app, personal local data, update workflow, and preparation of a separate owner service. This is a focused review, not a guarantee that all vulnerabilities have been eliminated.

## Implemented in this release

- Browser CSP restricts JavaScript to the app origin and the existing GoatCounter script origin. Inline script attributes and eval are disallowed; object embeds and base URL overrides are blocked. CSS inline values remain allowed because the app sets layout/weather/font properties dynamically.
- Connections and media are restricted to actual app providers. Archive.org media redirects require its subdomains; those domains cannot serve executable scripts. Referrer headers from the app are suppressed.
- The service worker only handles explicitly bundled public assets, app navigation and public Azan audio within /salah/. Requests carrying Authorization, unknown API paths, POST requests and other apps bypass it. Quran's existing verified-byte loader retains control of its hash-checked text cache.
- Security checks run before each Pages publication: rejected injected prototype keys, unsupported personal backup keys, changed/unconfirmed restore previews, private request cache bypass, preserved cumulative adhkar totals.

## Existing controls reviewed

- No matching private-key or credential patterns were found in the browser JS. No service-role, GoatCounter API token, database password or owner credential is needed in public dist files. Pattern scanning is not proof that a repository contains no secrets.
- UI text from city search, backups and Quran material uses escaping; Tajwid renders only known rules and escaped text. Quran data bytes are checked against packaged SHA-256 values.
- Analytics sends a fixed path/title; it excludes prayer history, adhkar repetitions, bookmarks, current ayah and city coordinates. Local development and DNT skip tracking.
- Personal records remain local; this release never clears localStorage or changes its data format. Existing backup validation has a size limit, typed allowlist, confirmation preview and rollback on failed writes.
- Private GoatCounter dashboard requires provider login. A public #admin login shell is not an administrator session. The cabinet is absent from public navigation.

## Owner service

The owner created a separate Supabase SALAH project (kbltwszfvphgbxdbczsb). During preparation, Data API was disabled, automatic new table grants were disabled and automatic RLS was enabled. Public signups were disabled after project creation; anonymous sign-ins and manual identity linking remain disabled, and email confirmation remains enabled. No SK Greens project settings or user data were changed.

The owner account was created by the human owner. The owner-access Edge Function is deployed and verifies each session against Supabase Auth getUser, then checks a fixed server-side owner user ID and confirmed email. An authenticated non-owner is denied. The client menu appears only after the server authorizes the session. Browser preferences, URL parameters, user_metadata and decoded JWTs grant no authority. Authentication sessions use a separate key and are excluded from prayer/adhkar backups; passwords are never persisted by SALAH. The official Supabase SDK 2.117.2 is bundled locally after npm SHA-512 integrity verification and covered by a pinned SHA-256 check.

The function uses its own Auth check for modern signing keys instead of the platform legacy-secret-only gate (verify_jwt=false). Live deployed tests confirm 401 for anonymous, forged-owner JWT and public-key-as-token requests, 403 for disallowed origin, and no-store responses. Local tests additionally verify other authenticated users and unconfirmed accounts are rejected. The human owner signed in successfully in the published app; the server-authorized cabinet and conditional More menu were verified. Session refresh during an in-flight gate check now rechecks the current session rather than authorizing a stale response.

Stats proxy is limited to fixed read-only GoatCounter aggregates and periods 1/7/30 days. It requires a server-only GOATCOUNTER_READ_TOKEN, which the human owner generated with Read statistics permission for only salah-saadi.goatcounter.com and saved in Supabase Secrets. The function prefers the canonical name and accepts the existing name with a trailing dot; the live data response was verified for 1, 7 and 30 days after owner sign-in. The 390-pixel phone layout was checked without horizontal overflow. Unconfigured stats requests return 503 and the verified owner can use the private GoatCounter dashboard link. No token or upstream error details are returned to the client.

## Remaining limits

- GitHub Pages cannot supply arbitrary security response headers through a _headers file. Meta CSP does not provide frame-ancestors clickjacking protection; do not claim it does. A controlled hosting layer is needed for response-only policies.
- Application code cannot establish that an iPhone iframe has a GoatCounter session. The top-level dashboard remains the fallback.
- GitHub Pages apps under the same account share a browser origin. A compromised sibling app or a compromised trusted script could read same-origin local storage, including the owner session. A dedicated origin with a controlled backend and HttpOnly session cookies would improve isolation.
- Personal records are not encrypted localStorage and can be lost if the browser/app data is cleared; they are not backed up to a server. Do not promise cloud recovery or inspect private user worship records.
- MFA for GitHub/Supabase/GoatCounter accounts and sign-in on the owner’s physical iPhone remain to be completed with the owner. Desktop phone-width testing does not establish physical-device behavior.
- Audit found no cloud worship database or public storage buckets in this SALAH app; do not create public tables/buckets just to store analytics.

References: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP ; https://www.goatcounter.com/help/csp ; https://supabase.com/docs/guides/database/secure-data ; https://supabase.com/docs/guides/functions/auth
