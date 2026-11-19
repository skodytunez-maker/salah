# Home resume session continuity

The07:21:31 recording shows cloudy Home,an app switch,and a temporary blue sky before clouds return. The installed version and exact runtime auth event are not visible;the physical-phone cause is not fully verified.

The bundled @supabase/supabase-js2.117.2 recovery path can emit SIGNED_IN for the retained session. Before530,owner-auth treated every SIGNED_IN as a revocation,disposing the ready sky. The real owner-auth/weather fixture reproduces this reset.

530 keeps an existing unexpired server/MFA grant only when repeated SIGNED_IN has the identical verified token and user ID. It never updates the grant timestamp from a client event. Existing TOKEN_REFRESHED behavior remains;the60-second getter and server authorization for all private operations are unchanged. A different login token,user,recovery,server denial,expiry or sign-out still requires the gate or disposes the scene. The token is held only in the existing module state and is never logged,rendered or backed up.

Sources checked2026-11-19: https://supabase.com/changelog.md and https://supabase.com/docs/reference/javascript/auth-onauthstatechange . No relevant SDK breaking change or SDK upgrade applies. No database,Edge Function,RLS or credentials change.

Phone check: with owner live sky explicitly enabled,leave cloudy Home for another app and return repeatedly;compare the sky,including after a longer absence. New live-sky artwork519 is still a separate private pilot.
