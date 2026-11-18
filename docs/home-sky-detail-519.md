# Owner-only sky detail candidate519

This candidate continues the owner's requested natural Home sky without changing ordinary users' basic day/night photographs or opening advanced sky access. Source baseline is the exact public518 tree7f26cb0f33b43c72fbe7461614a76aef0044df94. Publication is not authorized before the owner's phone review.

## Rendering

The synchronous painter reuses two texture samples, one interpolated field sample and one density sample. Motion-dependent flow coefficients are computed once per frame rather than once per pixel. Existing balanced output remains byte-identical to the public painter. Explicit fine mode uses a photograph sampled at up to512px wide and a cloud field bounded by256×320 pixels. The Home renderer requests it only inside the existing advanced-sky opt-in and current verified-owner policy. Basic mode retains zero advanced raster/texture/celestial work.

The final implementation preserves the existing arithmetic. No geometric light cache, approximate lighting lookup, per-day randomness, worker, extra network request, source photograph or skyline matte is introduced. Earlier large-grid and separable-light experiments were rejected and are not included in this source.

## Evidence

Independent fine regression hashes were captured from the unmodified public518 painter with only the same512/256/320 sampling bounds. Motion, sunlight movement, resizing/narrow sky, opaque night cloud and fog match those captures. Existing balanced day/sunset/night hashes and the date/location/midnight, local occlusion, overcast/fog and disposal regressions remain required.

An interleaved native desktop Canvas study measured28 samples per variant after warm-up: public518 median27.85ms/p9538.40ms; this fine variant median30.02ms/p9546.61ms. Median process CPU was31ms for both. These are desktop observations, not an iPhone timing guarantee; the fine variant can take longer. Limits remain explicit to avoid the earlier320×384 field's larger cost.

All63 immutable original photograph files match public518. Native matte preparation retains45,407,422 fully opaque foreground pixels byte-for-byte under identical sampling settings, including buildings, roofs, minarets and courtyard details. This proves pixel preservation, not that every contour or source photograph is physically perfect. No original photo is repainted. The source-specific matte/phone/tablet crop regressions remain in place.

The36-second native video study uses the actual candidate painter, local Sun/Moon calculation, lunar phase, sky projection, matte loader and foreground crop/blend functions on Makkah, Madinah and Al-Aqsa wallpapers. Weather states are labelled illustrative scenarios; it is not a real phone/browser recording or a live weather measurement. The actual application's prayer schedule, player and data are untouched.

## Delivery boundary

Keep public518, public515 news/expiry/acknowledgement, native update manifest and backend unchanged. The isolated candidate and preview are review artifacts. No global merge, public publication, external push or physical-phone approval is claimed.
