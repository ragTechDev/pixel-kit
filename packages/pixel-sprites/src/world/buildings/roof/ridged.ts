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
    const { c, W, yb, ramps } = f;
    const rise = riseOf(c.pitch);
    const back = yb - TOP - rise;
    const apex: Point = [ridge, yb - rise];
    const peak: Point = [ridge, TOP];
    const left = addPolygon(f.here(), [[1, yb], apex, peak, [1, yb - back]]);
    const right = addPolygon(f.here(), [[W - 1, yb], apex, peak, [W - 1, yb - back]]);
    layers.push(...paint(left, ramps.roof, rimmed(left, columns(), { top: LIGHT, left: SHADOW, right: LIGHT })));
    layers.push(...paint(right, shaded(ramps.roof), rimmed(right, columns(), { top: LIGHT, right: SHADOW, left: LIGHT })));
    return apex;
}

/** A gable roof; with `ridge` off the middle, a saltbox. The gable is the wall's own material, framed by the roof's edge boards in the trim colour. */
export function drawGable(f: Frame, ridge: number = f.W / 2): Layer[] {
    const { c, W, yw, yb, wx0, wx1, ramps } = f;
    const layers: Layer[] = [];
    const apex = slopes(f, ridge, layers);
    layers.push(...paint(addPolygon(f.here(), [[1, yb], [W - 1, yb], [ridge, apex[1] - 2]]), ramps.trim));
    const texture = wallPattern(c.wall, yw);
    layers.push(...paint(addPolygon(f.here(), [[wx0, yb], [wx1, yb], [ridge, apex[1] + 5]]), ramps.wall, (x, y) => (y >= yb - 2 ? SHADOW : texture(x, y))));
    if (c.windows !== "none") layers.push(...placeParts(f, roundWindowParts, ridge, yb - 7));
    return layers;
}

/** A hip roof: the same ridge, but the front is a sloping face of roof, so the wall under it is a plain rectangle. */
export function drawHip(f: Frame): Layer[] {
    const { W, yb, ramps } = f;
    const layers: Layer[] = [];
    const apex = slopes(f, W / 2, layers);
    const face = addPolygon(f.here(), [[1, yb], [W - 1, yb], apex]);
    layers.push(...paint(face, ramps.roof, rimmed(face, rows(), { bottom: SHADOW })));
    return layers;
}

/** The roof of the main part of a building with a front wing: a front slope and a back slope with the ridge running across, which the wing's own roof overlaps. */
export function drawSideGable(f: Frame): Layer[] {
    const { W, yb, ramps } = f;
    const ridge = TOP + Math.round((yb - TOP) * 0.45);
    const back = addPolygon(f.here(), [[1, TOP], [W - 1, TOP], [W - 1, ridge], [1, ridge]]);
    const front = addPolygon(f.here(), [[1, ridge], [W - 1, ridge], [W - 1, yb], [1, yb]]);
    return [
        ...paint(back, shaded(ramps.roof), rimmed(back, rows(), { top: LIGHT })),
        ...paint(front, ramps.roof, rimmed(front, rows(), { top: LIGHT, bottom: SHADOW }))
    ];
}
