import type { Layer } from "../../core/compose";
import { TILE_SIZE } from "../size";
import type { BuildingWall } from "./config";
import type { Frame } from "./frame";
import { addRect, LIGHT, mod, paint, SHADOW, type Pattern } from "./shapes";

/** What a wall material paints at a pixel. `top` is the row the wall starts on, so the pattern lines up with the gable above it. */
export function wallPattern(kind: BuildingWall, top: number): Pattern {
    return (x, y) => {
        const r = mod(y - top, 4096);
        switch (kind) {
            case "clapboard": return r % 4 === 3 ? SHADOW : r % 4 === 0 ? LIGHT : 0;
            case "brick": return r % 4 === 3 || (x + (Math.floor(r / 4) % 2) * 4) % 8 === 0 ? SHADOW : 0;
            case "stone": {
                // Blocks of different widths and heights, each lit along its top.
                const row = Math.floor(r / 7);
                const width = [14, 9, 12, 10][row % 4];
                const along = mod(x + [0, 5, 3, 8][row % 4], width);
                return r % 7 === 6 || along === width - 1 ? SHADOW : r % 7 === 0 && along < width - 2 ? LIGHT : 0;
            }
            default: return 0;
        }
    };
}

/** The wall with the shadow the roof casts on it, a stone foundation and, for a timber wall, the beams between the plaster. */
export function drawWall(f: Frame): Layer[] {
    const { c, yw, yb, wx0, wx1, H, ground, ramps } = f;
    const texture = wallPattern(c.wall, yw);
    const layers: Layer[] = [];

    layers.push(...paint(addRect(f.here(), wx0, yw, wx1, ground), ramps.wall, (x, y) => (y >= yb && y < yb + 3 ? SHADOW : texture(x, y))));
    layers.push(...paint(addRect(f.here(), wx0, H - 4, wx1, ground), ramps.stone, (x, y) => ((x + (y % 2) * 3) % 6 === 0 ? SHADOW : 0)));

    if (c.wall === "timber") {
        const beams = f.here();
        addRect(beams, wx0, yb + 3, wx1, yb + 6);
        addRect(beams, wx0, H - 8, wx1, H - 4);
        if (c.storeys === 2) addRect(beams, wx0, yw + 31, wx1, yw + 34);
        addRect(beams, wx0, yw, wx0 + 3, H - 4);
        addRect(beams, wx1 - 3, yw, wx1, H - 4);
        for (let k = 1; k < f.tiles; k += 1) addRect(beams, k * TILE_SIZE - 1, yw, k * TILE_SIZE + 1, H - 4);
        layers.push(...paint(beams, ramps.wood));
    }
    return layers;
}
