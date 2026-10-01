# SALAH visitor statistics

Status: prepared, disabled until the owner supplies a GoatCounter site address. No data is currently sent.

1. Owner registers at https://www.goatcounter.com/signup and keeps the dashboard private. Use skodytunez-maker.github.io/salah/ as the site.
2. Set ANALYTICS_SITE in dist/js/analytics.js to the public site address, e.g. https://your-name.goatcounter.com (never an API token or password).
3. Publish, then open the production app and confirm the first visit in the owner's dashboard.
4. Dashboard counts visits using GoatCounter sessions, not verified individual people or installations. Different devices, blockers and offline use affect estimates; previous usage cannot be recovered.

Only the fixed /salah/ path and SALAH title are sent. No route, query, city, prayer mark, counter, bookmark or ayah is read. Referrer is empty. Analytics is off on localhost and all other hosts; Do Not Track is respected. Resume after 30 minutes in the background records another visit, deduplicated by the service. Failure to load the counter never blocks the app.

Source: https://www.goatcounter.com/help/js and https://www.goatcounter.com/help/sessions
