import type { Layer } from "../../core/compose";
import { MAX_WINDOWS, type DoorPosition, type VolumeConfig, type WindowStyle } from "./config";
import type { Frame } from "./frame";
import { barrelParts, doorParts, flowerBoxParts, placeParts, stepParts, windowParts } from "./parts";
import { TILE_SIZE } from "../size";
import { addRect, paint, SHADOW } from "./shapes";

/** The tile column of the door. */
export function doorColumn(c: VolumeConfig): number {
    return c.door === "left" ? 1 : c.door === "right" ? c.width - 2 : Math.floor((c.width - 1) / 2);
}

/** How wide a slot each window needs: the window, and its shutters if it has them, with a little wall between neighbours. */
const slotWidth = (style: WindowStyle) => (style === "shuttered" ? 26 : 18);

interface Stretch {
    a: number;
    b: number;
    fits: number;
}

/** The stretches of wall from `x0` to `x1` a storey's windows can go in: all of it, or, with a door at pixel `door`, what is either side of the door. */
function stretches(x0: number, x1: number, style: WindowStyle, door?: number): Stretch[] {
    const spans = door === undefined ? [[x0, x1]] : [[x0, door - 10], [door + 10, x1]];
    return spans.filter(([a, b]) => b > a).map(([a, b]) => ({ a, b, fits: Math.floor((b - a) / slotWidth(style)) }));
}

const doorCentre = (width: number, door: DoorPosition) => (door === "left" ? 1 : door === "right" ? width - 2 : Math.floor((width - 1) / 2)) * TILE_SIZE + 8;

/**
 * The most windows a storey of a building `width` tiles wide fits, in a style; more asked for is brought down to this. Give
 * the door's position for the ground floor, where the door takes room from the windows.
 */
export function maxWindows(width: number, style: WindowStyle = "plain", door?: DoorPosition): number {
    const fits = stretches(4, width * TILE_SIZE - 4, style, door === undefined ? undefined : doorCentre(width, door)).reduce((n, s) => n + s.fits, 0);
    return Math.min(MAX_WINDOWS, fits);
}

/**
 * Where the windows of a storey are, as the pixel of each one's centre: `count` (or as many as fit) spaced evenly across the
 * wall from `x0` to `x1`. With a door at pixel `door` they are spaced evenly in what is either side of it, the longer side
 * getting the more, so the ground floor has as many windows as the storeys above.
 */
export function windowCentres(x0: number, x1: number, count: number, style: WindowStyle, door?: number): number[] {
    const parts = stretches(x0, x1, style, door);
    const given = parts.map(() => 0);
    for (let k = 0; k < count; k += 1) {
        let best = -1;
        parts.forEach((part, i) => {
            if (given[i] < part.fits && (best < 0 || (part.b - part.a) / (given[i] + 1) > (parts[best].b - parts[best].a) / (given[best] + 1))) best = i;
        });
        if (best < 0 || given.reduce((n, g) => n + g, 0) >= MAX_WINDOWS) break;
        given[best] += 1;
    }
    return parts.flatMap((part, i) => {
        const n = given[i];
        const slot = (part.b - part.a) / n;
        return Array.from({ length: n }, (_, k) => Math.round(part.a + slot * (k + 0.5)));
    });
}

/** What is on the front of the wall: windows (and their flower boxes), the door with its deck or steps, and the barrels beside it. A wall behind a wing has no door. */
export function drawFacade(f: Frame, { door: hasDoor = true }: { door?: boolean } = {}): Layer[] {
    const { c, W, H, yw, ground, ramps } = f;
    const layers: Layer[] = [];
    const door = doorColumn(c);

    // Windows, on every storey. The ground floor leaves the door's column clear.
    for (let storey = 0; storey < c.storeys; storey += 1) {
        const top = yw + storey * 32;
        const groundFloor = storey === c.storeys - 1;
        // Windows start below the shadow the eave casts on the wall (the wall shows from `top`, the roof's edge and its shadow take the first 7 rows).
        const windowTop = top + (groundFloor ? 14 : 9);
        const shown = f.c.windows > 0 ? windowCentres(f.wx0, f.wx1, c.windows, c.windowStyle, groundFloor && hasDoor ? door * TILE_SIZE + 8 : undefined) : [];
        for (const cx of shown) {
            layers.push(...placeParts(f, windowParts(c.windowStyle), cx, windowTop));
            if (c.props === "planters" && groundFloor) layers.push(...placeParts(f, flowerBoxParts, cx, windowTop));
        }
    }

    // The door stands on the ground, on a deck or above two steps.
    if (!hasDoor) return layers;
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
