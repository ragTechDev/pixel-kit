import type { Ramp } from "../../../core/sprite";
import type { RoofShape } from "../config";
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

/** Rows of shingles running along the eave, each row staggered. */
export const rows =
    (): Pattern =>
    (x, y) =>
        mod(y, 4) === 3 ? SHADOW : (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0 ? SHADOW : 0;

/** Rows of shingles running front to back, for a slope whose eave is its side. */
export const columns =
    (): Pattern =>
    (x, y) =>
        mod(x, 4) === 3 ? SHADOW : (y + (Math.floor(x / 4) % 2) * 4) % 8 === 0 ? SHADOW : 0;

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
