import type { Layer } from "../../../core/compose";
import type { Frame } from "../frame";
import { placeParts, roundWindowParts } from "../parts";
import { addPolygon, paint } from "../shapes";
import { wallPattern } from "../wall";
import { columns, LIGHT, rimmed, riseOf, rows, SHADOW, shaded, TOP, type Point } from "./common";

// Roofs with a ridge running front to back: you see a lit slope on the left, a shaded one on the right, the ridge between
// them and the roof's back edge across the top. What is at the front differs: a gable on the wall (gable and saltbox) or a
// sloping face of its own (hip). The saltbox has its ridge off to one side.

/** The two slopes either side of a ridge that stands at x = `ridge`. Returns where the ridge starts at the front. */
function slopes(f: Frame, ridge: number, layers: Layer[]): Point {
    const { c, rl, rr, yb, ramps } = f;
    const rise = riseOf(c.pitch);
    const back = yb - TOP - rise;
    const apex: Point = [ridge, yb - rise];
    const peak: Point = [ridge, TOP];
    const left = addPolygon(f.here(), [[rl, yb], apex, peak, [rl, yb - back]]);
    const right = addPolygon(f.here(), [[rr, yb], apex, peak, [rr, yb - back]]);
    layers.push(...paint(left, ramps.roof, rimmed(left, columns(), { top: LIGHT, left: SHADOW, right: LIGHT })));
    layers.push(...paint(right, shaded(ramps.roof), rimmed(right, columns(), { top: LIGHT, right: SHADOW, left: LIGHT })));
    return apex;
}

/** A gable roof; with `ridge` off the middle, a saltbox. The gable is the wall's own material, framed by the roof's edge boards in the trim colour. */
export function drawGable(f: Frame, ridge: number = f.mid): Layer[] {
    const { c, rl, rr, yb, yw, ramps } = f;
    const layers: Layer[] = [];
    const apex = slopes(f, ridge, layers);
    layers.push(...paint(addPolygon(f.here(), [[rl, yb], [rr, yb], [ridge, apex[1] - 2]]), ramps.trim));
    const texture = wallPattern(c.wall, f.H, f.xOffset);
    layers.push(...paint(addPolygon(f.here(), [[rl + 3, yb], [rr - 3, yb], [ridge, apex[1] + 5]]), ramps.wall, (x, y) => (y >= yb - 2 ? SHADOW : texture(x, y))));
    if (c.windows !== "none") layers.push(...placeParts(f, roundWindowParts, ridge, yb - 7));
    return layers;
}

/** A hip roof: the same ridge, but the front is a sloping face of roof, so the wall under it is a plain rectangle. */
export function drawHip(f: Frame): Layer[] {
    const { rl, rr, yb, ramps } = f;
    const layers: Layer[] = [];
    const apex = slopes(f, f.mid, layers);
    const face = addPolygon(f.here(), [[rl, yb], [rr, yb], apex]);
    layers.push(...paint(face, ramps.roof, rimmed(face, rows(), { bottom: SHADOW })));
    return layers;
}

/** The roof of the main part of a building with a front wing: a front slope and a back slope with the ridge running across, which the wing's own roof overlaps. */
export function drawSideGable(f: Frame): Layer[] {
    const { rl, rr, yb, ramps } = f;
    const ridge = TOP + Math.round((yb - TOP) * 0.45);
    const back = addPolygon(f.here(), [[rl, TOP], [rr, TOP], [rr, ridge], [rl, ridge]]);
    const front = addPolygon(f.here(), [[rl, ridge], [rr, ridge], [rr, yb], [rl, yb]]);
    return [
        ...paint(back, shaded(ramps.roof), rimmed(back, rows(), { top: LIGHT })),
        ...paint(front, ramps.roof, rimmed(front, rows(), { top: LIGHT, bottom: SHADOW }))
    ];
}
