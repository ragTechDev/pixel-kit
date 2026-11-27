import type { Layer } from "../../../core/compose";
import type { Ramp } from "../../../core/sprite";
import type { Frame } from "../frame";
import { addRect, blend, mod, paint } from "../shapes";
import { LIGHT, SHADOW, TOP } from "./common";
import type { Area } from "./rooftop";

// A flat roof seen from above and in front: a thick parapet of coping stones round all four sides, thicker at the front where
// you see more of it, and inside it the floor of the roof in large square tiles, with the shadow the back and left parapets
// cast along their inner edges. What is on the roof (air conditioners, boxes, a garden) is in `rooftop.ts`.

const SIDE = 6;
const BACK = 6;
const FRONT = 9;

/** The floor of a roof: the roof's shadow tone in two tiles of nearly the same tone. */
const floorRamp = (roof: Ramp): Ramp => ({
    outline: roof.outline,
    base: roof.shadow,
    shadow: blend(roof.shadow, roof.outline, 0.35),
    highlight: blend(roof.shadow, roof.base, 0.35)
});

export function drawFlat(f: Frame): { layers: Layer[]; area: Area } {
    const { c, rl, rr, yb, ramps } = f;
    const parapet = addRect(f.here(), rl, TOP, rr, yb);
    // Where the roof meets the taller wall beside it there is no parapet: the floor runs up to the wall.
    const x0 = c.joined?.left ? rl : rl + SIDE;
    const y0 = TOP + BACK;
    const x1 = c.joined?.right ? rr : rr - SIDE;
    const y1 = yb - FRONT;
    const floor = addRect(f.here(), x0, y0, x1, y1);
    // The coping is stones 16 wide: joints across the top and bottom, and along the sides.
    const stones = (x: number, y: number) => ((y < y0 || y >= y1 ? mod(x, 16) === 15 : mod(y, 16) === 15) ? SHADOW : 0);
    const tiles = (x: number, y: number) => {
        // The shadow the back parapet casts, and along the left; and the one the taller wall casts, along the side it is on.
        if (y < y0 + 3 || x < x0 + 3 || (c.joined?.right === true && x >= x1 - 4)) return SHADOW;
        return (Math.floor((x - x0) / 16) + Math.floor((y - y0) / 16)) % 2 === 1 ? LIGHT : 0;
    };
    return {
        layers: [...paint(parapet, ramps.roof, stones), ...paint(floor, floorRamp(ramps.roof), tiles)],
        area: { x0: x0 + 3, y0: y0 + 4, x1: x1 - 3, y1: y1 - 3 }
    };
}
