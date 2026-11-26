import { queryCell, TILE_SIZE, type TileMap } from "@ragtechdev/pixel-sprites";
import type { Direction } from "./input";

const STEP: Record<Direction, readonly [number, number]> = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0]
};

/** The tile next to (tx, ty) in a direction. */
export function neighbor(tx: number, ty: number, direction: Direction): { x: number; y: number } {
    const [dx, dy] = STEP[direction];
    return { x: tx + dx, y: ty + dy };
}

export interface WalkOptions {
    /**
     * Count a door as open even where its tile is solid, as a door in a wall is, so a walker can step onto it
     * and the game can warp when `update` reports the arrival. Default false.
     */
    readonly doors?: boolean;
}

/** True when a walker can stand on the tile: it is on the map and neither solid terrain, water nor a blocking object covers it. */
export function isWalkable(map: TileMap, tx: number, ty: number, { doors = false }: WalkOptions = {}): boolean {
    const cell = queryCell(map, tx, ty);
    return cell !== undefined && (!cell.solid || (doors && cell.door));
}

export interface WalkerOptions {
    /** Starting tile. */
    readonly x: number;
    readonly y: number;
    readonly facing?: Direction;
    /** Tiles per second. Default 4, a steady walk. */
    readonly speed?: number;
}

/** `moved`: a step began. `blocked`: the tile is not open, so the walker only turned. `busy`: a step is still under way. */
export type WalkResult = "moved" | "blocked" | "busy";

export interface Walker {
    /** The tile the walker stands on. While a step is under way, the tile it is leaving. */
    readonly tx: number;
    readonly ty: number;
    /** Position in world pixels, in the middle of a step as well. Whole numbers. */
    readonly x: number;
    readonly y: number;
    readonly facing: Direction;
    readonly moving: boolean;
    /** Starts one tile step when idle. `canEnter` decides whether the next tile is open, for example `(x, y) => isWalkable(map, x, y)`. */
    walk(direction: Direction, canEnter: (tx: number, ty: number) => boolean): WalkResult;
    /** Advances a step by `dt` seconds. Returns true on the update the walker arrives, the moment to check for a door or an encounter. */
    update(dt: number): boolean;
    /** Puts the walker on a tile at once, ending any step. */
    teleport(tx: number, ty: number, facing?: Direction): void;
}

const EPSILON = 1e-9;
const whole = (value: number) => Number.isInteger(value);

/** One walker on a tile grid, like a character in a pokered-style world. Movement is a tile at a time, drawn smoothly in between. */
export function createWalker({ x, y, facing = "down", speed = 4 }: WalkerOptions): Walker {
    if (!whole(x) || !whole(y)) throw new Error("A walker starts on a whole tile");
    if (!(speed > 0) || !Number.isFinite(speed)) throw new Error("speed must be a positive number of tiles per second");
    let tx = x;
    let ty = y;
    let face = facing;
    let progress = 0;
    let moving = false;
    return {
        get tx() {
            return tx;
        },
        get ty() {
            return ty;
        },
        get x() {
            return Math.round(tx * TILE_SIZE + STEP[face][0] * progress * TILE_SIZE);
        },
        get y() {
            return Math.round(ty * TILE_SIZE + STEP[face][1] * progress * TILE_SIZE);
        },
        get facing() {
            return face;
        },
        get moving() {
            return moving;
        },
        walk(direction, canEnter) {
            if (moving) return "busy";
            face = direction;
            const next = neighbor(tx, ty, direction);
            if (!canEnter(next.x, next.y)) return "blocked";
            moving = true;
            progress = 0;
            return "moved";
        },
        update(dt) {
            if (!moving) return false;
            progress += Math.max(0, dt) * speed;
            if (progress < 1 - EPSILON) return false;
            const next = neighbor(tx, ty, face);
            tx = next.x;
            ty = next.y;
            progress = 0;
            moving = false;
            return true;
        },
        teleport(nx, ny, direction) {
            if (!whole(nx) || !whole(ny)) throw new Error("A walker stands on a whole tile");
            tx = nx;
            ty = ny;
            if (direction) face = direction;
            progress = 0;
            moving = false;
        }
    };
}
