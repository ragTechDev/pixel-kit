import type { Layer } from "../../core/compose";
import type { Frame } from "./frame";
import { chimneyParts, placeParts, roundWindowParts } from "./parts";
import { addPolygon, filled, LIGHT, paint, SHADOW } from "./shapes";
import { wallPattern } from "./wall";

/** The front slope of the roof, narrower at the ridge, in rows of shingles, and for a gable the gable facing the front. */
export function drawRoof(f: Frame): Layer[] {
    const { c, W, yw, yb, wx0, wx1, ramps } = f;
    const layers: Layer[] = [];

    const slope = Math.round((yb - 1) * 0.28);
    const roof = addPolygon(f.here(), [[1, yb], [W - 1, yb], [W - 1 - slope, 1], [1 + slope, 1]]);
    // The left and right edge of the roof in a row, for the lit and shaded edges.
    const span = (y: number) => {
        let l = W, r = -1;
        for (let x = 0; x < W; x += 1) if (filled(roof, x, y)) { l = Math.min(l, x); r = x; }
        return [l, r] as const;
    };
    layers.push(...paint(roof, ramps.roof, (x, y) => {
        const [l, r] = span(y);
        if (y >= yb - 3) return SHADOW;
        if (y < 4) return LIGHT;
        if (r - x < 3) return SHADOW;
        if (x - l < 2) return LIGHT;
        const row = Math.floor((y - 4) / 4);
        if ((y - 4) % 4 === 3) return SHADOW;
        return (x + (row % 2) * 4) % 8 === 0 ? SHADOW : 0;
    }));

    if (c.roof === "gable") {
        // The gable is the wall's own material, framed by the roof's edge boards (in the trim colour).
        const apex = yw - (c.pitch === "steep" ? 28 : 16);
        layers.push(...paint(addPolygon(f.here(), [[1, yb], [W - 1, yb], [W / 2, apex - 2]]), ramps.trim));
        const texture = wallPattern(c.wall, yw);
        layers.push(...paint(addPolygon(f.here(), [[wx0, yb], [wx1, yb], [W / 2, apex + 5]]), ramps.wall, (x, y) => (y >= yb - 2 ? SHADOW : texture(x, y))));
        if (c.windows !== "none") layers.push(...placeParts(f, roundWindowParts, W / 2, yb - 7));
    }
    return layers;
}

/** A chimney rising through the roof. */
export function drawChimney(f: Frame): Layer[] {
    if (f.c.chimney === "none") return [];
    return placeParts(f, chimneyParts, Math.round(f.c.chimney === "left" ? f.W * 0.26 : f.W * 0.74), 0);
}
