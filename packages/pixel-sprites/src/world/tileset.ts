import { tileIds } from "./tiles";
import type { TileId } from "./types";

/** A block is a square arrangement of tiles. Maps refer to blocks by a single character. */
export type Block = readonly (readonly TileId[])[];

/**
 * Terrain behaviour lives in per-tileset lists of tile ids, not in per-cell
 * flags: every cell that uses a listed tile inherits the behaviour. Objects
 * (trees, doors, furniture) carry their own behaviour, see `objectInfo`.
 */
export interface TileSetDefinition {
    id: string;
    /** Tiles per block side. Defaults to 2. */
    blockSize?: number;
    /** Block art, keyed by a single character. */
    blocks: Readonly<Record<string, Block>>;
    /** Tiles that block movement. */
    solid?: readonly TileId[];
    /**
     * Tiles that block movement only from a pixel row down, counted from the top of the tile (1 to 15): the part of a shore tile that is
     * water blocks, and the grass and sand above it do not. A `solid` tile ignores this.
     */
    solidFrom?: Readonly<Partial<Record<TileId, number>>>;
    /**
     * For pixel collision (`solidBoxes`), the parts of a tile that block, as rectangles `[x0, y0, x1, y1]` in pixels from the tile's top-left
     * corner (0 to 16, the right and bottom edges not included), for a tile that blocks only a strip of itself, such as the thin wall of a room.
     * It replaces the whole tile or the `solidFrom` row for pixel collision. List the tile in `solid` as well to block it for tile movement.
     */
    solidArea?: Readonly<Partial<Record<TileId, readonly (readonly [number, number, number, number])[]>>>;
    /** Water tiles (swim or surf). */
    water?: readonly TileId[];
    /** Tiles that can trigger encounters. */
    grass?: readonly TileId[];
}

export interface TileSet {
    readonly id: string;
    readonly blockSize: number;
    readonly blocks: Readonly<Record<string, Block>>;
    readonly solid: ReadonlySet<TileId>;
    readonly solidFrom: ReadonlyMap<TileId, number>;
    readonly solidArea: ReadonlyMap<TileId, readonly (readonly [number, number, number, number])[]>;
    readonly water: ReadonlySet<TileId>;
    readonly grass: ReadonlySet<TileId>;
}

function checkTiles(setId: string, list: string, ids: readonly TileId[]): ReadonlySet<TileId> {
    for (const id of ids) {
        if (!tileIds.includes(id)) throw new Error(`Tileset "${setId}": unknown tile "${id}" in ${list}`);
    }
    return new Set(ids);
}

/** Validates and freezes a tileset. Throws on unknown tiles, bad block keys or block sizes. */
export function defineTileSet(def: TileSetDefinition): TileSet {
    const blockSize = def.blockSize ?? 2;
    if (!Number.isInteger(blockSize) || blockSize < 1) {
        throw new Error(`Tileset "${def.id}": blockSize must be a positive integer`);
    }
    for (const [key, block] of Object.entries(def.blocks)) {
        if (key.length !== 1) throw new Error(`Tileset "${def.id}": block key "${key}" must be one character`);
        if (block.length !== blockSize || block.some((row) => row.length !== blockSize)) {
            throw new Error(`Tileset "${def.id}": block "${key}" must be ${blockSize}×${blockSize}`);
        }
        for (const row of block) checkTiles(def.id, `block "${key}"`, row);
    }
    const solidFrom = Object.entries(def.solidFrom ?? {}) as [TileId, number][];
    checkTiles(def.id, "solidFrom", solidFrom.map(([id]) => id));
    for (const [id, row] of solidFrom) {
        if (!Number.isInteger(row) || row < 1 || row > 15) throw new Error(`Tileset "${def.id}": solidFrom for "${id}" must be a whole pixel row from 1 to 15`);
    }
    const solidArea = Object.entries(def.solidArea ?? {}) as [TileId, readonly (readonly [number, number, number, number])[]][];
    checkTiles(def.id, "solidArea", solidArea.map(([id]) => id));
    for (const [id, rects] of solidArea) {
        for (const r of rects) {
            const [x0, y0, x1, y1] = r;
            if (r.length !== 4 || ![x0, y0, x1, y1].every(Number.isInteger) || x0 < 0 || y0 < 0 || x1 > 16 || y1 > 16 || x0 >= x1 || y0 >= y1) {
                throw new Error(`Tileset "${def.id}": solidArea for "${id}" must be rectangles [x0, y0, x1, y1] inside the 16 pixel tile`);
            }
        }
    }
    return Object.freeze({
        id: def.id,
        blockSize,
        blocks: def.blocks,
        solid: checkTiles(def.id, "solid", def.solid ?? []),
        solidFrom: new Map(solidFrom),
        solidArea: new Map(solidArea),
        water: checkTiles(def.id, "water", def.water ?? []),
        grass: checkTiles(def.id, "grass", def.grass ?? [])
    });
}
