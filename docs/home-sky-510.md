# Home atmosphere candidate 510

The owner requested a more natural dawn/sunset after reviewing real footage, different-looking days, and the same effect on all available Home wallpapers, including small areas of visible sky. This work is confined to Home atmosphere, source matte data, regression checks and release metadata. Future SALAH business directions are recorded separately in `docs/product-ideas.md`; they are not application features or public announcements.

## Rendering contract

- One continuous opaque sky replaces the source sky; no dense upper cloud photograph fades into a different baked-in lower sky.
- The same DOM-independent atmosphere painter drives the application and the in-chat study. A photographic density field supplies two slowly advected cloud layers, local cloud alpha and directional cloud-edge illumination. There is no separate horizontal red/pink colour stripe.
- Date/location styles blend continuously between neighbouring local solar days. Reopening does not pick another random sky. Measured cloud cover and fog constrain colour and celestial visibility; dense overcast/fog still hide the discs.
- Sun and Moon keep the existing astronomical horizon/phase logic. Their position on an uncalibrated source photograph remains a schematic projection, not a compass or a measured photo bearing.
- Day/night foregrounds use individual source mattes and source crops. Their premultiplied weighted sum avoids residual night buildings in daytime sky holes and avoids translucent buildings at twilight.
- Original decoded photographs remain the fallback until the atmosphere, both source mattes and canvas surfaces are ready. No partial image or coarse rectangular sky mask should be revealed. Unknown/changed curated source images must fall back safely until their matte is reviewed.
- Hidden scenes stop motion; reduced motion keeps a static accurate state. The caller bounds output resolution/cadence, and the painter bounds its density field and reusable buffers.

## Matte preparation provenance

The original photographs are unchanged. Source-specific alpha mattes are prepared locally from the existing catalogue photographs and conservative SVG guides. Semantic sky probabilities assist edge refinement and are followed by visual inspection; they do not repaint architecture.

Development-only reference model: `Xenova/segformer-b0-finetuned-ade-512-512`, pinned Hugging Face revision `d3e5499fa8701ff0453ca940a8dfeae39b2f1504`, converted from the NVIDIA/Hugging Face SegFormer model. The ONNX file and ONNX Runtime are local preparation tools, not shipped application dependencies. No photograph is uploaded for inference. Preparation evidence, source hashes and review images are retained in the task's `outputs/sky-realism-next` directory.

Primary model documentation: <https://huggingface.co/Xenova/segformer-b0-finetuned-ade-512-512> and <https://huggingface.co/nvidia/segformer-b0-finetuned-ade-512-512>.

## Visual references and limits

Real reference footage: NPS/N. Lewis, [Shenandoah sunrise](https://www.flickr.com/photos/snpphotos/30174294051); NPS, [Grand Canyon North Rim sunset](https://www.nps.gov/media/video/view.htm?id=FE1422E6-155D-451F-67271BA4F8D9DD79); NPS, [Rocky Mountain clouds at sunset](https://www.nps.gov/media/video/view.htm?id=4C25871C-EAC7-4E76-84BE-0F77DAC5384F). Frame sequences were inspected, rather than inferring appearance solely from page descriptions. Timelapse speed, camera exposure and colour grading are not calibrated to SALAH.

This remains a lightweight photographic illustration, not a volumetric weather simulation or a live camera. Ground shadows and source reflections do not acquire reconstructed 3D geometry. Real phone appearance and performance require a physical-device check; native Canvas renders and unit/DOM checks do not establish Safari pixel output.

Candidate validation and publication status are recorded in the release evidence outside the application source. This document alone does not assert that 510 is published or physically verified.
