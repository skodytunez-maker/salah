# Pages publication reliability after release 505

The application files of release 505 are unchanged by this workflow correction.
All existing checkout, verification, native archive, media staging, permissions
and concurrency settings remain in their original order.

## Observed failure

Main commit `49249a9d8501075c74a85a8a8ed7b91d9a9f9d7e` ran Publish SALAH
`43971668517`. Its first attempt successfully uploaded artifact `14279560578`,
but the immediate Pages lookup reported zero matching artifacts. A second
attempt uploaded `14278632835` under the same `github-pages` name; the lookup
then found both artifacts and rejected the ambiguous selection. Both artifacts
were later visible through the read-only run-artifact API, non-expired and
associated with that exact main commit. The source/archive checks had passed.

## Narrow correction

The upload and both publish steps use the same trusted workflow-generated name:
`github-pages-${{ github.run_id }}-${{ github.run_attempt }}`. A full job rerun
therefore uses a different name and cannot select the previous attempt's
artifact. Existing artifacts are not deleted.

After upload, the workflow waits 10 seconds before its first official
`actions/deploy-pages@v5` call. That call permits a single bounded recovery:
if its actual outcome is failure, wait 15 seconds and call the same action once
more with the same artifact name. The second call does not continue on error.
Its failure therefore fails the job honestly; there is no unbounded loop or
fallback to an older artifact. A first-call success skips both retry steps.
The environment URL uses the first non-empty action output; a URL alone is not
proof that deployment succeeded.

This retries the action's own artifact lookup/deployment path rather than
treating a separate REST response as proof that its internal metadata is ready.
It adds no REST helper, package, credential handling or Actions permission.
The existing Pages/OIDC permissions and serialized publication are retained.
Each action still has its existing deployment timeout; the fixed waits alone
do not imply a 25-second total deployment deadline.

## Official contracts and verification

- [upload-pages-artifact v3 metadata](https://github.com/actions/upload-pages-artifact/blob/v3/action.yml)
  supports a custom `name` and delegates its archive upload to upload-artifact v4.
- [deploy-pages v5 metadata](https://github.com/actions/deploy-pages/blob/v5/action.yml)
  accepts `artifact_name` and exposes `page_url`.
- [deploy-pages v5 artifact lookup](https://github.com/actions/deploy-pages/blob/v5/src/internal/api-client.js)
  uses `DefaultArtifactClient.listArtifacts()` and rejects zero or multiple
  same-name matches before creating a Pages deployment.
- [GitHub step outcomes](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#steps-context)
  distinguish actual `outcome` from `conclusion` after `continue-on-error`.

Local source review compares every pre-upload step and permission with the
released workflow and checks three control-flow cases: first success
skips retry; first failure followed by success recovers; two failures leave a
failed final publish step. A standalone YAML parser was not available in the
local runtime; syntax and step semantics were independently reviewed without
installing dependencies. CI/publication must verify the new workflow on its
exact commit before a successful public release is reported.
