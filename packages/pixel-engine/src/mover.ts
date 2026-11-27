import { mapTileSize, solidBoxes, TILE_SIZE, type Box, type TileMap } from "@ragtechdev/pixel-sprites";
import type { Direction } from "./input";

const STEP: Record<Direction, readonly [number, number]> = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0]
};

/** True when two boxes share some area. Boxes that only touch along an edge do not overlap. */
export function overlaps(a: Box, b: Box): boolean {
    return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * True when a box (in world pixels) is on the map and clear of everything solid: terrain, water, standing objects and the
 * drawn wall of a building (`solidBoxes`). The roof of a building is open, so a walker can stand behind it. Pass anything
 * else that blocks, such as another character, as `also`.
 */
export function isOpen(map: TileMap, box: Box, also: readonly Box[] = []): boolean {
    const size = mapTileSize(map);
    if (box.x < 0 || box.y < 0 || box.x + box.width > size.width * TILE_SIZE || box.y + box.height > size.height * TILE_SIZE) return false;
    return !solidBoxes(map).some((solid) => overlaps(box, solid)) && !also.some((other) => overlaps(box, other));
}

export interface MoverOptions {
    /** Starting position in world pixels: the top-left corner of the tile-sized cell the walker's feet are in the bottom of. */
    readonly x: number;
    readonly y: number;
    readonly facing?: Direction;
    /** Pixels per second. Default 64, the same pace as a walker's four tiles a second. */
    readonly speed?: number;
    /** The part that collides, relative to the cell. Default a small box at the feet: 10 wide, 4 tall, on the bottom edge. */
    readonly hitbox?: Box;
    /**
     * How many pixels off a doorway or a corner the mover is nudged sideways, one pixel per pixel travelled, to get round
     * it, so a door does not have to be lined up to the pixel. Default 0: the mover stops flush against whatever is in
     * its way. Keep it below the height of the hitbox, or a mover tile-aligned with a character slides round them.
     */
    readonly assist?: number;
}

export interface Mover {
    /** Position in world pixels, always whole numbers. */
    readonly x: number;
    readonly y: number;
    readonly facing: Direction;
    /** True when the last `step` moved. */
    readonly moving: boolean;
    /** The colliding box in world pixels. Its bottom edge is the line the mover stands on, which is what to sort by. */
    readonly feet: Box;
    /** The point `distance` pixels in front of the middle of the feet, to see what the mover is facing. */
    ahead(distance: number): { x: number; y: number };
    /**
     * Moves `dt` seconds in a direction (or stands still for `null` or `undefined`, as `input.heldDirection()` returns) one pixel at a time and stops flush against whatever
     * `open` rejects, so it reaches the very edge of a wall. `open` gets the box the feet would occupy, for example
     * `(box) => isOpen(map, box)`. `scale` is a speed multiplier, such as 2 to run.
     */
    step(dt: number, direction: Direction | null | undefined, open: (box: Box) => boolean, scale?: number): void;
    /** Puts the mover at a pixel position at once. */
    teleport(x: number, y: number, facing?: Direction): void;
}

const whole = (value: number) => Number.isInteger(value);

/** One walker that is not tied to a grid: it can stand at any pixel, like a character in a free-roaming pixel-art game. */
export function createMover({ x, y, facing = "down", speed = 64, hitbox = { x: 3, y: 12, width: 10, height: 4 }, assist = 0 }: MoverOptions): Mover {
    if (!whole(x) || !whole(y)) throw new Error("A mover starts on a whole pixel");
    if (!(speed > 0) || !Number.isFinite(speed)) throw new Error("speed must be a positive number of pixels per second");
    if (!whole(assist) || assist < 0) throw new Error("assist must be a whole number of pixels");
    let px = x;
    let py = y;
    let face = facing;
    let moving = false;
    // The part of a pixel travelled but not yet stepped.
    let carry = 0;
    const box = (dx = 0, dy = 0): Box => ({ x: px + hitbox.x + dx, y: py + hitbox.y + dy, width: hitbox.width, height: hitbox.height });
    return {
        get x() {
            return px;
        },
        get y() {
            return py;
        },
        get facing() {
            return face;
        },
        get moving() {
            return moving;
        },
        get feet() {
            return box();
        },
        ahead(distance) {
            const [sx, sy] = STEP[face];
            return { x: px + hitbox.x + hitbox.width / 2 + sx * distance, y: py + hitbox.y + hitbox.height / 2 + sy * distance };
        },
        step(dt, direction, open, scale = 1) {
            moving = false;
            if (!direction) {
                carry = 0;
                return;
            }
            face = direction;
            carry += Math.max(0, dt) * speed * scale;
            let pixels = Math.floor(carry);
            carry -= pixels;
            const [sx, sy] = STEP[direction];
            // Across the way: sideways when going up or down, and the other way round.
            const [cx, cy] = [Math.abs(sy), Math.abs(sx)];
            while (pixels > 0) {
                pixels -= 1;
                if (open(box(sx, sy))) {
                    px += sx;
                    py += sy;
                    moving = true;
                    continue;
                }
                // Blocked. Slide round a corner if there is a clear way within `assist` pixels.
                let nudge = 0;
                for (let k = 1; k <= assist && nudge === 0; k += 1) {
                    for (const sign of [-1, 1]) {
                        if (open(box(cx * k * sign, cy * k * sign)) && open(box(cx * k * sign + sx, cy * k * sign + sy))) {
                            nudge = sign;
                            break;
                        }
                    }
                }
                if (nudge === 0) {
                    carry = 0;
                    break;
                }
                px += cx * nudge;
                py += cy * nudge;
                moving = true;
            }
        },
        teleport(nx, ny, direction) {
            if (!whole(nx) || !whole(ny)) throw new Error("A mover stands on a whole pixel");
            px = nx;
            py = ny;
            if (direction) face = direction;
            moving = false;
            carry = 0;
        }
    };
}
