import type { Layer } from "../../core/compose";
import type { ResolvedBuildingConfig } from "./config";
import type { Frame } from "./frame";
import { barrelParts, doorParts, flowerBoxParts, placeParts, stepParts, windowParts } from "./parts";
import { TILE_SIZE } from "../size";
import { addRect, paint, SHADOW } from "./shapes";

/** The tile column of the door. */
export function doorColumn(c: ResolvedBuildingConfig): number {
    return c.door === "left" ? 1 : c.door === "right" ? c.width - 2 : Math.floor((c.width - 1) / 2);
}

/** The tile columns that have a window on a storey: mirrored pairs from the corners in, never touching, then the middle. */
export function windowColumns(width: number, count: ResolvedBuildingConfig["windows"], skip?: number): number[] {
    if (count === "none") return [];
    const pairs: number[][] = [];
    for (let k = 1; width - 1 - k >= k; k += 2) pairs.push(k === width - 1 - k ? [k] : width - 1 - k - k >= 2 ? [k, width - 1 - k] : []);
    const used = count === "some" ? pairs.slice(0, 1) : pairs;
    return used.flat().filter((col) => col !== skip).sort((a, b) => a - b);
}

/** What is on the front of the wall: windows (and their flower boxes), the door with its deck or steps, and the barrels beside it. */
export function drawFacade(f: Frame): Layer[] {
    const { c, W, H, yw, ground, ramps } = f;
    const layers: Layer[] = [];
    const door = doorColumn(c);

    // Windows, on every storey. The ground floor leaves the door's column clear.
    for (let storey = 0; storey < c.storeys; storey += 1) {
        const top = yw + storey * 32;
        const groundFloor = storey === c.storeys - 1;
        for (const col of windowColumns(f.tiles, c.windows, groundFloor ? door : undefined)) {
            layers.push(...placeParts(f, windowParts(c.windowStyle), col * TILE_SIZE + 8, top + 8));
            if (c.props === "planters" && groundFloor) layers.push(...placeParts(f, flowerBoxParts, col * TILE_SIZE + 8, top + 8));
        }
    }

    // The door stands on the ground, on a deck or above two steps.
    const dcx = door * TILE_SIZE + 8;
    const bottom = c.porch === "deck" ? H - 7 : c.porch === "steps" ? H - 5 : ground;
    if (c.porch === "deck") layers.push(...paint(addRect(f.here(), 2, H - 7, W - 2, ground), ramps.wood, (x) => (x % 8 === 0 ? SHADOW : 0)));
    layers.push(...placeParts(f, doorParts(c.doorStyle), dcx, bottom));
    if (c.porch === "steps") layers.push(...placeParts(f, stepParts, dcx, bottom));

    // Barrels beside the door, on whichever side has room.
    if (c.props === "barrels") {
        const first = door < f.tiles - 2 ? (door + 1) * TILE_SIZE + 1 : (door - 1) * TILE_SIZE + 6;
        for (const x of [first, first + 9]) layers.push(...placeParts(f, barrelParts, x, ground - 10));
    }
    return layers;
}
