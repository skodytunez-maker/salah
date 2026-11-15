# Image presentation stability

This change preserves existing images, controls, text, portrait dimensions, Home geometry, crop calculations and the ranking model. It adds no bulk image download, new artwork, public labels or identity tracking.

- Player portraits are prepared offscreen, then revealed only after the replacement and visible image node have fully loaded and decoded. A different reciter uses the existing neutral reserved frame while loading, never the previous reciter’s photograph. Repeated playback ticks reuse the current request. Superseded or disposed requests cannot commit.
- Catalogue and Top portraits retain native lazy loading. Only explicitly marked portrait images are hidden until load and decode complete. Existing local person artwork is used on failure. Per-host observers replace older bindings and release pending work and online handlers when the host or its old images leave the DOM.
- Home’s selected day/night photographs and masks finish loading and decoding before their layers become visible. Existing New York tablet artwork falls back to its corresponding phone artwork if unavailable. No geometry, astronomical coordinates or prayer data is changed.
- Landmark swaps include the mask in the ready condition. A failed city request keeps the last fully decoded city with its original truthful caption. A later response for an abandoned city cannot replace the current selection. Only the explicitly failed cached image is invalidated after decode failure.
- Landmark responses must be complete status 200, non-opaque, without Content-Range, within the existing size/type limits and consistent with an unencoded Content-Length. Partial or truncated responses are rejected before caching. Existing valid images are preserved.

`scripts/check-image-presentation.mjs` exercises progressive dimensions before load, deferred decode, failure/fallback, rapid portrait selection, cancellation, disconnected nodes, native lazy behavior, already cached images, observer cleanup, Home pair/mask readiness, stale city responses, tablet fallback and partial/opaque/truncated landmark responses. Existing Home, player, catalogue, ranking, privacy and listening tests remain applicable. These are local DOM/load-state tests; they do not claim browser/device rendering verification.

The new runtime module `./js/image-presentation.js` must be included with the app shell so its importing screens remain available offline. It requires no additional image assets or storage cache.
