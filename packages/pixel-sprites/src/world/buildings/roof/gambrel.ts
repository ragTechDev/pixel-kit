import type { Layer } from "../../../core/compose";
import type { Frame } from "../frame";
import { addPolygon, paint } from "../shapes";
import { LIGHT, lit, rimmed, rows, SHADOW, shaded, TOP } from "./common";

/** The row where a gambrel roof's steep lower slope meets its flatter upper one. */
export const gambrelSplit = (f: Frame): number => f.yb - Math.round((f.yb - TOP) * 0.4);

/** A gambrel roof, ridge across: the steep lower slope in shade under the flatter upper one, which catches the light. */
export function drawGambrel(f: Frame): Layer[] {
    const { rl, rr, yb, ramps } = f;
    const split = gambrelSplit(f);
    const upper = addPolygon(f.here(), [[rl + 3, TOP], [rr - 3, TOP], [rr, split], [rl, split]]);
    const lower = addPolygon(f.here(), [[rl, split], [rr, split], [rr, yb], [rl, yb]]);
    return [
        ...paint(upper, lit(ramps.roof), rimmed(upper, rows(), { top: LIGHT, left: LIGHT, right: SHADOW })),
        ...paint(lower, shaded(ramps.roof), rimmed(lower, rows(), { top: LIGHT, bottom: SHADOW }))
    ];
}
