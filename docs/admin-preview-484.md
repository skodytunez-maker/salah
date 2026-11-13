# SALAH 484: five sections for the owner and active administrators

Radio, Muallim Sani, the live-broadcast screen, an example teacher cabinet and an example online lesson become available after a current server-side `staff-cabinet` gate confirms owner or active admin and MFA. Moderators, ordinary accounts and revoked admins are denied. Client metadata does not grant access.

The existing owner gate and private `owner-access` endpoints are unchanged. Home listening/reading/dhikr participant lists, locations, user cards and owner reports remain owner-only. No teacher appointments are made.

Teacher cabinet and admin online lessons use synthetic examples and make no classroom, pupil, homework or LiveKit requests. Existing appointed teachers keep their real classroom access; the owner retains the existing private lesson iframe. An administrator never receives an owner iframe session.

The native course is delivered by the protected `team-course` Edge Function. Each GET checks the existing authoritative `staff-cabinet` gate again; the payload contains only the 51 course units and 4 blocks. The course data stays outside the public repository and web bundle. Owner/teacher classroom sessions and source-book endpoints are unchanged. No learning-service restart, table changes or Supabase migrations are required.

The team-only news has five feature illustrations and uses the shared looping motion contract. It is shown only to verified eligible accounts. Only «Понятно» stores its account-bound acknowledgement. Escape/backdrop close does not consume it; Menu can reopen it. The public announcement remains edition 479 with its original deadline and receipt.

This release does not launch a real radio stream, live broadcast, quiz participants or prizes. Real iPhone rendering/touch and admin smoke checks remain required after publication; local UI tests use a DOM fixture.
