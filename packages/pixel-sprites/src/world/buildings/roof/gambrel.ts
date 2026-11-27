import type { Layer } from "../../../core/compose";
import type { Frame } from "../frame";
import { addPolygon, paint } from "../shapes";
import { LIGHT, lit, rimmed, rows, SHADOW, shaded, TOP } from "./common";

/** A gambrel roof, ridge across: the steep lower slope in shade under the flatter upper one, which catches the light. */
export function drawGambrel(f: Frame): Layer[] {
    const { W, yb, ramps } = f;
    const split = yb - Math.round((yb - TOP) * 0.4);
    const upper = addPolygon(f.here(), [[4, TOP], [W - 4, TOP], [W - 1, split], [1, split]]);
    const lower = addPolygon(f.here(), [[1, split], [W - 1, split], [W - 1, yb], [1, yb]]);
    return [
        ...paint(upper, lit(ramps.roof), rimmed(upper, rows(), { top: LIGHT, left: LIGHT, right: SHADOW })),
        ...paint(lower, shaded(ramps.roof), rimmed(lower, rows(), { top: LIGHT, bottom: SHADOW }))
    ];
}
