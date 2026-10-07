# SALAH QR login

Existing email/code/password login remains available. A signed-out device creates
a two-minute request; a signed-in phone previews it and must explicitly approve
the matching six-digit display code. Requests have independent 256-bit polling
and approval secrets. Only their SHA-256 hashes are stored. The QR contains only
the request UUID and approval secret, in the URL fragment; no access or refresh
token. The fragment is removed with replaceState after capture, and credentials
are never stored in browser storage or analytics. Requests are private-schema
rows with RLS and all browser-role permissions revoked. They are deleted after
15 minutes on subsequent creation. Creation is bounded to 10 per IP hash per
15 minutes. Requests and responses have no-store headers.

Approval validates Auth getUser/getClaims, confirmed nonanonymous user, issuer,
and an existing auth.sessions row. Verified MFA accounts must approve at aal2.
Atomic conditional UPDATE allows one decision and one redemption. Redemption
rechecks the approving active session and uses server-side admin generateLink
for the same existing confirmed email, without sending mail or creating another
user. The requesting device calls verifyOtp with token_hash to get its own new
session. Existing phone refresh tokens are never copied. Owner authority still
requires its existing server/MFA checks on the new device (new session is aal1).

Known behavior: a camera may open Safari/browser instead of the installed PWA;
if that browser does not share the logged-in app's session, sign in there first.
No automatic approval or camera permission prompt is made. A failed/lost
redemption response requires a fresh request; no reused credentials are returned.

Dependencies: qrcode-generator 1.4.4, Kazuhiko Arase, MIT; fetched from the npm
registry tarball and verified against its published SHA-512 integrity. Original
header retained; only `export default qrcode` appended for ES module use. Notice
is shipped at dist/js/vendor/qrcode-generator-LICENSE.txt, including native web
bundles. No image or third-party QR service receives login URLs.

Deploy the additive schema in supabase/qr-login-schema.sql, then qr-login with
verify_jwt=false (the handler implements approval authentication and secret-based
request authorization). Run scripts/check-qr-login.mjs and the full check-app.
An end-to-end two-device test with a dedicated test account remains necessary
before enabling/publicly releasing the feature; do not log real session tokens.
