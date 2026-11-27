import type { Layer } from "../../../core/compose";
import type { Frame } from "../frame";
import { addPolygon, paint } from "../shapes";
import { LIGHT, lit, rimmed, rows, SHADOW, shaded, TOP } from "./common";

/** A gambrel roof, ridge across: the steep lower slope in shade under the flatter upper one, which catches the light. */
export function drawGambrel(f: Frame): Layer[] {
    const { rl, rr, yb, ramps } = f;
    const split = yb - Math.round((yb - TOP) * 0.4);
    const upper = addPolygon(f.here(), [[rl + 3, TOP], [rr - 3, TOP], [rr, split], [rl, split]]);
    const lower = addPolygon(f.here(), [[rl, split], [rr, split], [rr, yb], [rl, yb]]);
    return [
        ...paint(upper, lit(ramps.roof), rimmed(upper, rows(f.c.roofMaterial), { top: LIGHT, left: LIGHT, right: SHADOW })),
        ...paint(lower, shaded(ramps.roof), rimmed(lower, rows(f.c.roofMaterial), { top: LIGHT, bottom: SHADOW }))
    ];
}
