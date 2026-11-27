import type { Layer } from "../../../core/compose";
import type { Frame } from "../frame";
import { addPolygon, addRect, paint } from "../shapes";
import { columns, LIGHT, lit, rimmed, rows, SHADOW, shaded, TOP, type Point } from "./common";
import type { Area } from "./rooftop";

// Hip roofs with a flat top: the roof slopes up on all four sides to a flat plane, so the front slope is a trapezoid under
// it and the left and right slopes are bands either side. A steep roof has a taller front slope and a narrower flat.

/** How far in from the sides a flat top is. A mansard is always steep, with its flat top narrower than a hip roof's. */
function flatTopInset(f: Frame, skirt: number): number {
    const steep = f.c.pitch === "steep" || skirt > 0;
    return Math.round((f.rr - f.rl) * (steep ? 0.23 : 0.17));
}

/** How far below the top the outer corner of the left and right slopes is: where the side of the roof starts. */
export function flatTopDrop(f: Frame, skirt: number): number {
    return Math.round(flatTopInset(f, skirt) * 0.55);
}

function drawFlatTop(f: Frame, skirt: number): { layers: Layer[]; area: Area } {
    const { c, rl, rr, yb, ramps } = f;
    const layers: Layer[] = [];
    const steep = c.pitch === "steep" || skirt > 0;
    const inset = flatTopInset(f, skirt);
    const frontHeight = steep ? 26 : 16;
    const yf = yb - frontHeight;
    const drop = flatTopDrop(f, skirt);
    const l = rl + inset;
    const r = rr - inset;
    // The front's lower corners come in a little when there is a flared skirt, so the skirt reads as a lip.
    const lower = skirt ? 5 : 0;
    const leftEdge: Point[] = skirt ? [[rl, yb], [rl + lower, yb - skirt], [l, yf]] : [[rl, yb], [l, yf]];
    const rightEdge: Point[] = skirt ? [[rr, yb], [rr - lower, yb - skirt], [r, yf]] : [[rr, yb], [r, yf]];

    const leftBand = addPolygon(f.here(), [...leftEdge, [l, TOP], [rl, TOP + drop]]);
    const rightBand = addPolygon(f.here(), [...rightEdge, [r, TOP], [rr, TOP + drop]]);
    const front = addPolygon(f.here(), [...leftEdge, ...[...rightEdge].reverse()]);
    const flat = addRect(f.here(), l, TOP, r, yf);
    layers.push(...paint(leftBand, ramps.roof, rimmed(leftBand, columns(), { top: LIGHT, left: SHADOW })));
    layers.push(...paint(rightBand, shaded(ramps.roof), rimmed(rightBand, columns(), { top: LIGHT, right: SHADOW })));
    // The skirt is set off from the steep slope above it by a line of shadow.
    const courses = skirt ? (x: number, y: number) => (y === yb - skirt ? SHADOW : rows()(x, y)) : rows();
    layers.push(...paint(front, ramps.roof, rimmed(front, courses, { top: LIGHT, bottom: SHADOW })));
    layers.push(...paint(flat, lit(ramps.roof), rimmed(flat, rows(), { top: LIGHT, left: LIGHT, right: SHADOW, bottom: SHADOW })));
    return { layers, area: { x0: l + 3, y0: TOP + 3, x1: r - 3, y1: yf - 3 } };
}

/** A hip roof with a flat top. */
export const drawHipFlat = (f: Frame) => drawFlatTop(f, 0);

/** A hip roof with a flat top and a flared skirt at the eave, the fake mansard. */
export const drawMansard = (f: Frame) => drawFlatTop(f, 11);
