// Celestial positions belong to the sky projection,not to the interface.
// Retain this public helper as an identity for existing consumers/tests.
// Panels may cover a disc;they must never change coordinates,phase or visibility.
export function layoutSkyObjects(sky){return sky;}
