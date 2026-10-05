const GLOW_STOPS = [
  [0, 1], [2, 0.96], [5, 0.72], [10, 0.40], [15, 0.20], [30, 0]
];
const STALE_SAMPLE_MS = 1000;
const REARM_HOLD_MS = 250;

/** Normalize a real compass angle; missing samples remain missing. */
export function normalizeAngle(value) {
  return Number.isFinite(value) ? ((value % 360) + 360) % 360 : NaN;
}

/** The shortest turn from `from` to `to`; positive means turn right. */
export function signedAngleDifference(from, to) {
  const start = normalizeAngle(from);
  const end = normalizeAngle(to);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return NaN;
  const difference = ((end - start + 540) % 360) - 180;
  return difference === -180 ? 180 : difference;
}

/** A continuous, monotone white-light scale with soft threshold transitions. */
export function glowForError(error) {
  if (!Number.isFinite(error)) return 0;
  const distance = Math.abs(error);
  if (distance >= 30) return 0;
  for (let i = 1; i < GLOW_STOPS.length; i++) {
    const [end, endIntensity] = GLOW_STOPS[i];
    if (distance > end) continue;
    const [start, startIntensity] = GLOW_STOPS[i - 1];
    const progress = (distance - start) / (end - start);
    const eased = progress * progress * (3 - 2 * progress);
    return startIntensity + (endIntensity - startIntensity) * eased;
  }
  return 0;
}

/**
 * Filter compass samples in the circular domain using elapsed milliseconds.
 * The first valid sample is immediate; old/out-of-order samples never invent
 * a direction. A long interruption starts from the new measured heading.
 */
export function createDirectionTracker({ tau = 120, enter = 2, exit = 3.5, rearm = 8 } = {}) {
  const timeConstant = Number.isFinite(tau) && tau > 0 ? tau : 120;
  const enterThreshold = Number.isFinite(enter) && enter >= 0 ? enter : 2;
  const exitThreshold = Number.isFinite(exit) ? Math.max(enterThreshold, exit) : Math.max(enterThreshold, 3.5);
  const rearmThreshold = Number.isFinite(rearm) ? Math.max(exitThreshold, rearm) : Math.max(exitThreshold, 8);
  let filteredHeading = null;
  let lastTimestamp = null;
  let aligned = false;
  let hapticArmed = true;
  let outsideSince = null;

  function reset({ rearmHaptic = true } = {}) {
    filteredHeading = null;
    lastTimestamp = null;
    aligned = false;
    if (rearmHaptic) hapticArmed = true;
    outsideSince = null;
  }

  function update(heading, bearing, timestamp) {
    if (![heading, bearing, timestamp].every(Number.isFinite)) return null;
    if (lastTimestamp !== null && timestamp < lastTimestamp) return null;
    const sampleHeading = normalizeAngle(heading);
    const elapsed = lastTimestamp === null ? 0 : timestamp - lastTimestamp;
    if (filteredHeading === null || elapsed > STALE_SAMPLE_MS) {
      filteredHeading = sampleHeading;
      outsideSince = null;
    } else {
      const alpha = -Math.expm1(-elapsed / timeConstant);
      filteredHeading = normalizeAngle(filteredHeading + signedAngleDifference(filteredHeading, sampleHeading) * alpha);
    }
    lastTimestamp = timestamp;
    const signedError = signedAngleDifference(filteredHeading, bearing);
    const error = Math.abs(signedError);
    const wasAligned = aligned;
    aligned = aligned ? error <= exitThreshold : error <= enterThreshold;

    // One vibration per approach. Small threshold jitter never rearms it.
    if (error >= rearmThreshold) {
      if (outsideSince === null) outsideSince = timestamp;
      if (timestamp - outsideSince >= REARM_HOLD_MS) hapticArmed = true;
    } else {
      outsideSince = null;
    }
    const haptic = aligned && !wasAligned && hapticArmed;
    if (haptic) hapticArmed = false;
    return {
      heading: filteredHeading,
      error,
      signedError,
      intensity: glowForError(error),
      aligned,
      haptic
    };
  }

  return { update, reset };
}

/** Keep the last drawing during unreliable samples; sub-degree noise does not
 * move the whole compass. Both rings share a single, unwrapped heading. */
export function createCompassPresentation({ deadband = .4 } = {}) {
  let heading = null, north = null, target = null;
  return {
    update(state) {
      if (!state.hasHeading || !Number.isFinite(state.heading) || !Number.isFinite(state.signedError)) return null;
      const delta = heading === null ? 0 : signedAngleDifference(heading, state.heading);
      if (heading !== null && Math.abs(delta) < deadband) return null;
      north = north === null ? -state.heading : north - delta;
      target = target === null ? state.signedError : target - delta;
      heading = state.heading;
      return { north, target };
    }
  };
}
