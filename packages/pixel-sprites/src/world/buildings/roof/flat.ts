import type { Layer } from "../../../core/compose";
import type { Frame } from "../frame";
import { addRect, paint } from "../shapes";
import { LIGHT, mod, rimmed, SHADOW, shaded, TOP } from "./common";

/** A flat roof seen from above: a panel with vertical seams inside a low wall, thicker along the front. */
export function drawFlat(f: Frame): Layer[] {
    const { W, yb, ramps } = f;
    const roof = addRect(f.here(), 1, TOP, W - 1, yb);
    const seams = (x: number) => (mod(x, 8) === 7 ? SHADOW : 0);
    return paint(roof, shaded(ramps.roof), rimmed(roof, (x) => seams(x), { top: LIGHT, left: LIGHT, right: SHADOW, bottom: SHADOW }));
}
