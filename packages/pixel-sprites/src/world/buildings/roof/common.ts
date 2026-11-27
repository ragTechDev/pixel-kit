import type { Ramp } from "../../../core/sprite";
import type { RoofMaterial, RoofShape } from "../config";
import { filled, LIGHT, mod, SHADOW, type Pattern, type Shape } from "../shapes";

// The roof is seen from above and in front. Every roof shares these measurements: the eave is a straight line across
// the picture where the roof meets the wall, and the roof fills everything above it up to the top row of the picture.
// A longer building has a taller roof, so what changes with length is how far the roof goes up.

export type Point = readonly [number, number];
export type Side = "top" | "bottom" | "left" | "right";

/** A roof drawn inside a building's frame. `sideGable` is the roof of the part of a cross-gabled building behind its wing. */
export type RoofKind = RoofShape | "sideGable";

/** The top row of a roof. */
export const TOP = 2;

/** How high a ridge stands over the eave, as it looks on the screen. A steep roof stands higher. */
export const riseOf = (pitch: "low" | "steep") => (pitch === "steep" ? 30 : 20);

/** A ramp for a slope facing away from the light: its tones one step darker. */
export const shaded = (r: Ramp): Ramp => ({ outline: r.outline, base: r.shadow, shadow: r.outline, highlight: r.base });

/** A ramp for a flat plane that catches the light: its tones one step lighter. */
export const lit = (r: Ramp): Ramp => ({ outline: r.outline, base: r.highlight, shadow: r.base, highlight: r.highlight });

/** A cheap deterministic scatter of small whole numbers, for the strands of thatch. */
const scatter = (a: number, b: number): number => {
    let h = Math.imul(a * 73856093 + 19, 0x9e3779b1) ^ Math.imul(b * 19349663 + 7, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    return (h ^ (h >>> 13)) >>> 0;
};

/**
 * What a roof covering paints at a point, where `u` runs along the eave and `v` down the slope: courses of staggered shingles,
 * barrel tiles that run down the slope, straw in loose strands, or planks of shakes in staggered courses.
 */
const coverings: Record<RoofMaterial, Pattern> = {
    shingle: (u, v) => (mod(v, 4) === 3 ? SHADOW : (u + (Math.floor(v / 4) % 2) * 4) % 8 === 0 ? SHADOW : 0),
    ceramic: (u, v) => {
        const along = mod(u + (Math.floor(v / 8) % 2) * 3, 6);
        return mod(v, 8) === 7 ? SHADOW : along === 5 ? SHADOW : along === 0 ? LIGHT : 0;
    },
    thatch: (u, v) => {
        if (mod(v, 10) === 9) return u % 2 === 0 ? SHADOW : 0;
        const strand = scatter(u, Math.floor((v + (scatter(u, 0) % 5)) / 5)) % 8;
        return strand < 2 ? SHADOW : strand > 5 ? LIGHT : 0;
    },
    wood: (u, v) => {
        const along = mod(u + Math.floor(v / 6) * 2, 5);
        return mod(v, 6) === 5 ? SHADOW : along === 4 ? SHADOW : mod(v, 6) === 0 && along < 3 ? LIGHT : 0;
    }
};

/** The covering along the eave: its courses run across the slope, as on a front face. */
export const rows =
    (material: RoofMaterial): Pattern =>
    (x, y) =>
        coverings[material](x, y);

/** The covering on a slope whose eave is its side: the same, turned. */
export const columns =
    (material: RoofMaterial): Pattern =>
    (x, y) =>
        coverings[material](y, x);

/** A band two or three pixels wide along the edges of a shape that face `side`: lit along the top and the ridge, in shadow along an eave. */
export function rimmed(s: Shape, texture: Pattern, rims: Partial<Record<Side, number>>): Pattern {
    return (x, y) => {
        if (rims.top && !filled(s, x, y - 2)) return rims.top;
        if (rims.bottom && !filled(s, x, y + 3)) return rims.bottom;
        if (rims.left && !filled(s, x - 2, y)) return rims.left;
        if (rims.right && !filled(s, x + 2, y)) return rims.right;
        return texture(x, y);
    };
}

export { LIGHT, mod, SHADOW };
