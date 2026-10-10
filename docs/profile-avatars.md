# Private profile avatars

The user chooses one JPEG/PNG/WebP image locally, previews and moves the circular crop, adjusts zoom and explicitly saves. The app renders a 512x512 JPEG without copying source EXIF or the original filename, with an export cap of 200,000 bytes and a 20 MB source limit.

Production storage is configured in the private profile-avatars bucket. Native Storage RLS allows authenticated non-anonymous users to read, insert, update and delete only the exact path <auth.uid()>/profile.jpg. Public access is disabled. The app also checks that the current confirmed session matches the requested account. Images are downloaded as authenticated blobs and displayed through local object URLs; there are no public avatar URLs or image data in JWT user metadata.

Caches are account-bound, checked against the current session, revoked on account changes and protected against stale downloads replacing newly saved photos. The crop dialog and photo controls stop on account/route changes. Removing the account removes the avatar through the Storage API before deleting the Auth user, preserving all existing deletion/MFA/session gates.

The user explicitly approved production private Storage and own-photo policies. The migration is applied and account deletion cleanup is deployed. Local crop/upload-contract tests and UI tests use generated, non-personal test imagery; no user photo was uploaded during development.
