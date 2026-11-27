import type { Layer } from "../../../core/compose";
import type { Frame } from "../frame";
import { OUTLINE, addPolygon, paint, BASE, type Pattern } from "../shapes";
import { LIGHT, mod, SHADOW, TOP } from "./common";

/** A rounded roof: lit along the curve of the top, then plain, then in shade where it rolls under at the eave. */
export function drawBarrel(f: Frame): Layer[] {
    const { W, yb, ramps } = f;
    const roof = addPolygon(f.here(), [
        [1, yb], [W - 1, yb], [W - 1, TOP + 9], [W - 2, TOP + 5], [W - 4, TOP + 3], [W - 7, TOP + 1], [W - 10, TOP],
        [10, TOP], [7, TOP + 1], [4, TOP + 3], [2, TOP + 5], [1, TOP + 9]
    ]);
    const courses = (x: number, y: number) => mod(y, 4) === 3 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0;
    const pattern: Pattern = (x, y) => {
        if (y < TOP + 12) return courses(x, y) ? BASE : LIGHT;
        if (y >= yb - 12) return mod(y, 4) === 3 ? OUTLINE : SHADOW;
        return courses(x, y) ? SHADOW : 0;
    };
    return paint(roof, ramps.roof, pattern);
}
