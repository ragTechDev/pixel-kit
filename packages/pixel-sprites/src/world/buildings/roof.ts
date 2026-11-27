import type { Layer } from "../../core/compose";
import type { Ramp } from "../../core/sprite";
import type { Frame } from "./frame";
import { chimneyParts, placeParts, roundWindowParts } from "./parts";
import { addPolygon, filled, LIGHT, mod, paint, SHADOW, type Pattern, type Shape } from "./shapes";
import { wallPattern } from "./wall";

// The roof is seen from above and in front, so you see its slopes and the far end of it, not just the front.
// A gable roof has its ridge running front to back: a lit slope on the left, a shaded one on the right, the ridge
// between them and the back edge across the top, with the gable on the wall at the front. A hip roof slopes on all
// four sides: you see the big front slope and the left and right slopes either side of it.

type Point = readonly [number, number];
type Side = "top" | "bottom" | "left" | "right";

/** A ramp for a slope facing away from the light: its tones one step darker. */
const shaded = (r: Ramp): Ramp => ({ outline: r.outline, base: r.shadow, shadow: r.outline, highlight: r.base });

/** Rows of shingles running along the eave, each row staggered. */
const rows =
    (): Pattern =>
    (x, y) =>
        mod(y, 4) === 3 ? SHADOW : (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0 ? SHADOW : 0;

/** Rows of shingles running front to back, for a slope whose eave is its side. */
const columns =
    (): Pattern =>
    (x, y) =>
        mod(x, 4) === 3 ? SHADOW : (y + (Math.floor(x / 4) % 2) * 4) % 8 === 0 ? SHADOW : 0;

/** A band two or three pixels wide along the edges of a shape that face `side`: lit along the top and the ridge, in shadow along an eave. */
function rimmed(s: Shape, texture: Pattern, rims: Partial<Record<Side, number>>): Pattern {
    return (x, y) => {
        if (rims.top && !filled(s, x, y - 2)) return rims.top;
        if (rims.bottom && !filled(s, x, y + 3)) return rims.bottom;
        if (rims.left && !filled(s, x - 2, y)) return rims.left;
        if (rims.right && !filled(s, x + 2, y)) return rims.right;
        return texture(x, y);
    };
}

function drawGable(f: Frame): Layer[] {
    const { c, W, yw, yb, wx0, wx1, ramps } = f;
    const layers: Layer[] = [];
    const mid = W / 2;
    // How high the ridge stands over the eave, and how far back the roof goes (both as they look on the screen).
    const rise = c.pitch === "steep" ? 30 : 20;
    const back = yb - 2 - rise;
    const ridge = yb - back - rise;
    const left: Point[] = [[1, yb], [mid, yb - rise], [mid, ridge], [1, yb - back]];
    const right: Point[] = [[W - 1, yb], [mid, yb - rise], [mid, ridge], [W - 1, yb - back]];

    const leftSlope = addPolygon(f.here(), left);
    const rightSlope = addPolygon(f.here(), right);
    layers.push(...paint(leftSlope, ramps.roof, rimmed(leftSlope, columns(), { top: LIGHT, left: SHADOW, right: LIGHT })));
    layers.push(...paint(rightSlope, shaded(ramps.roof), rimmed(rightSlope, columns(), { top: LIGHT, right: SHADOW, left: LIGHT })));

    // The gable on the front wall, framed by the roof's edge boards (in the trim colour).
    layers.push(...paint(addPolygon(f.here(), [[1, yb], [W - 1, yb], [mid, yb - rise - 2]]), ramps.trim));
    const texture = wallPattern(c.wall, yw);
    layers.push(...paint(addPolygon(f.here(), [[wx0, yb], [wx1, yb], [mid, yb - rise + 5]]), ramps.wall, (x, y) => (y >= yb - 2 ? SHADOW : texture(x, y))));
    if (c.windows !== "none") layers.push(...placeParts(f, roundWindowParts, mid, yb - 7));
    return layers;
}

function drawHip(f: Frame): Layer[] {
    const { W, yb, ramps } = f;
    const layers: Layer[] = [];
    // The ridge runs along the top. The corners at the back are higher up the picture than the front eave, and the
    // ridge's ends are drawn in from the sides by as much as the roof drops back.
    const back = yb - Math.round((yb - 2) * 0.55);
    const inset = Math.round((yb - back) * 0.62);
    const top = 2;
    const frontLeft: Point = [1, yb];
    const frontRight: Point = [W - 1, yb];
    const ridgeLeft: Point = [1 + inset, top];
    const ridgeRight: Point = [W - 1 - inset, top];

    const leftFace = addPolygon(f.here(), [frontLeft, ridgeLeft, [1, back]]);
    const rightFace = addPolygon(f.here(), [frontRight, ridgeRight, [W - 1, back]]);
    const frontFace = addPolygon(f.here(), [frontLeft, frontRight, ridgeRight, ridgeLeft]);
    layers.push(...paint(leftFace, ramps.roof, rimmed(leftFace, columns(), { top: LIGHT, left: SHADOW })));
    layers.push(...paint(rightFace, shaded(ramps.roof), rimmed(rightFace, columns(), { top: LIGHT, right: SHADOW })));
    layers.push(...paint(frontFace, ramps.roof, rimmed(frontFace, rows(), { top: LIGHT, bottom: SHADOW })));
    return layers;
}

/** The roof: its slopes and, for a gable, the gable on the wall. */
export function drawRoof(f: Frame): Layer[] {
    return f.c.roof === "gable" ? drawGable(f) : drawHip(f);
}

/** A chimney rising through the roof. */
export function drawChimney(f: Frame): Layer[] {
    if (f.c.chimney === "none") return [];
    return placeParts(f, chimneyParts, Math.round(f.c.chimney === "left" ? f.W * 0.26 : f.W * 0.74), f.c.roof === "hip" ? 10 : 6);
}
