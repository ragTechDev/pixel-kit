import type { Layer } from "../../core/compose";
import { TILE_SIZE } from "../size";
import type { BuildingWall } from "./config";
import type { Frame } from "./frame";
import { addRect, LIGHT, mod, paint, SHADOW, type Pattern } from "./shapes";

/**
 * What a wall material paints at a pixel. The pattern is counted up from `bottom`, the row the wall stands on, and across from
 * the left of the whole picture (`shift` is where this volume's left edge is), so it lines up with the gable above it and
 * carries on across a join to the volume beside it.
 */
export function wallPattern(kind: BuildingWall, bottom: number, shift = 0): Pattern {
    return (px, y) => {
        const x = px + shift;
        const r = mod(bottom - y, 4096);
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
    const texture = wallPattern(c.wall, H, f.xOffset);
    const layers: Layer[] = [];

    // Where the wall carries on into the next volume, its pattern runs out to the edge.
    const open = { left: c.joined?.left, right: c.joined?.right };
    layers.push(...paint(addRect(f.here(), wx0, yw, wx1, ground), ramps.wall, (x, y) => (y >= yb && y < yb + 3 ? SHADOW : texture(x, y)), open));
    layers.push(...paint(addRect(f.here(), wx0, H - 4, wx1, ground), ramps.stone, (x, y) => ((x + f.xOffset + (y % 2) * 3) % 6 === 0 ? SHADOW : 0), open));

    if (c.wall === "timber") {
        const beams = f.here();
        addRect(beams, wx0, yb + 3, wx1, yb + 6);
        addRect(beams, wx0, H - 8, wx1, H - 4);
        if (c.storeys === 2) addRect(beams, wx0, yw + 31, wx1, yw + 34);
        // A post at each corner, but not where the wall carries on into the next volume.
        if (!c.joined?.left) addRect(beams, wx0, yw, wx0 + 3, H - 4);
        if (!c.joined?.right) addRect(beams, wx1 - 3, yw, wx1, H - 4);
        for (let k = 1; k < f.tiles; k += 1) addRect(beams, k * TILE_SIZE - 1, yw, k * TILE_SIZE + 1, H - 4);
        layers.push(...paint(beams, ramps.wood));
    }
    return layers;
}
