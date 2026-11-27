import type { ColorName } from "../core/colors";
import { composeSprites, layerBounds, type Layer, type Raster } from "../core/compose";
import { parseHex, type HexColor } from "../core/customColor";
import { buildingBox, buildingFootprint, buildingLayers } from "./buildings/draw";
import { resolveBuildingConfig, type BuildingConfig } from "./buildings/config";
import { objectColors, objectDamage, objectIds, objectInfo, objectLayers, type ObjectDamage } from "./objects/objects";
import { TILE_SIZE } from "./size";
import { themeSlots, tileSprite } from "./tiles";
import { resolveTheme, tileColorsKey, type TileColors } from "./tiles/palettes";
import type { TileSet } from "./tileset";
import { treeBearings, treeCrops, treeStages, type TreeBearing, type TreeStage } from "./objects/fruitTree";
import type { ObjectId, TileId, TreeCrop } from "./types";

/** An object placed on a map. `x` and `y` are the tile coordinates of its top-left footprint tile. */
export interface PlacedObject {
    readonly id: ObjectId;
    readonly x: number;
    readonly y: number;
    /** One of the object's common colours (`objectColors`) or a hex colour, replacing its main colour. Only for objects that have one. */
    readonly color?: ColorName | HexColor;
    /** `"half"` or `"ruin"` for a broken or burnt object (`objectDamage`). It looks different, and blocks the same cells. */
    readonly damage?: ObjectDamage;
    /** For a `fruit_tree`: how far it has grown (`treeStages`). */
    readonly stage?: TreeStage;
    /** For a `fruit_tree`: leaves only, flowers or fruit (`treeBearings`). Only a mature tree bears. */
    readonly bearing?: TreeBearing;
    /** For a `fruit_tree`: which crop it is (`treeCrops`). */
    readonly crop?: TreeCrop;
}

/**
 * A building placed on a map. `x` and `y` are the tile coordinates of the top-left tile of its box (its width and
 * height are in tiles, see `buildingBox`). Its walls and roof are solid, and the tile at the foot of its door is
 * open and has `door` set.
 */
export interface PlacedBuilding {
    readonly config?: BuildingConfig;
    readonly x: number;
    readonly y: number;
}

/** A map is a grid of block characters plus placed objects. One character per block keeps maps tiny. */
export interface TileMap {
    readonly tileset: TileSet;
    readonly rows: readonly string[];
    readonly objects: readonly PlacedObject[];
    readonly buildings: readonly PlacedBuilding[];
    /** Width in blocks. */
    readonly width: number;
    /** Height in blocks. */
    readonly height: number;
}

export interface CellInfo {
    readonly tile: TileId;
    /** The object covering this cell. A standing object wins over a ground one. */
    readonly object?: ObjectId;
    /** The building covering this cell. */
    readonly building?: PlacedBuilding;
    /** True for solid terrain and for solid footprint cells of standing objects. */
    readonly solid: boolean;
    readonly water: boolean;
    readonly grass: boolean;
    readonly counter: boolean;
    readonly door: boolean;
}

interface Occupant {
    readonly object?: PlacedObject;
    readonly building?: PlacedBuilding;
    /** Footprint character at this cell: `#` solid, `.` open, `D` the foot of a door (open). */
    readonly mark: string;
}

const occupancy = new WeakMap<TileMap, { standing: Map<number, Occupant>; ground: Map<number, Occupant> }>();

/**
 * Validates a map against its tileset. Throws on ragged rows, unknown block
 * characters or objects, objects outside the map, objects of the same
 * layer that overlap, a `color` that is not valid for its object, and buildings that do not fit or that
 * overlap an object or another building.
 */
export function defineMap(tileset: TileSet, rows: readonly string[], objects: readonly PlacedObject[] = [], buildings: readonly PlacedBuilding[] = []): TileMap {
    if (rows.length === 0) throw new Error("A map needs at least one row");
    const width = rows[0].length;
    rows.forEach((row, y) => {
        if (row.length !== width) throw new Error(`Map row ${y} is ${row.length} wide, expected ${width}`);
        for (const ch of row) {
            if (!tileset.blocks[ch]) throw new Error(`Map row ${y}: no block "${ch}" in tileset "${tileset.id}"`);
        }
    });

    const tilesWide = width * tileset.blockSize;
    const tilesHigh = rows.length * tileset.blockSize;
    const index = { standing: new Map<number, Occupant>(), ground: new Map<number, Occupant>() };
    for (const placed of objects) {
        if (!objectIds.includes(placed.id)) throw new Error(`Unknown object "${String(placed.id)}"`);
        const info = objectInfo[placed.id];
        if (
            !Number.isInteger(placed.x) || !Number.isInteger(placed.y) ||
            placed.x < 0 || placed.y < 0 || placed.x + info.width > tilesWide || placed.y + info.height > tilesHigh
        ) {
            throw new Error(`Object "${placed.id}" at (${placed.x}, ${placed.y}) does not fit in the map`);
        }
        if (placed.color !== undefined) {
            const common = objectColors[placed.id];
            if (!common || !(common.includes(placed.color as ColorName) || parseHex(placed.color))) {
                throw new Error(`Object "${placed.id}" cannot be coloured "${String(placed.color)}"`);
            }
        }
        if (placed.damage !== undefined && !objectDamage.includes(placed.damage)) {
            throw new Error(`Object "${placed.id}" cannot be damaged "${String(placed.damage)}"`);
        }
        if (placed.stage !== undefined && !treeStages.includes(placed.stage)) throw new Error(`Object "${placed.id}" cannot be at stage "${String(placed.stage)}"`);
        if (placed.bearing !== undefined && !treeBearings.includes(placed.bearing)) throw new Error(`Object "${placed.id}" cannot bear "${String(placed.bearing)}"`);
        if (placed.crop !== undefined && !treeCrops.includes(placed.crop)) throw new Error(`Object "${placed.id}" cannot be the crop "${String(placed.crop)}"`);
        const cells = index[info.layer];
        for (let dy = 0; dy < info.height; dy += 1) {
            for (let dx = 0; dx < info.width; dx += 1) {
                const key = (placed.y + dy) * tilesWide + placed.x + dx;
                if (cells.has(key)) {
                    throw new Error(`Object "${placed.id}" at (${placed.x}, ${placed.y}) overlaps another ${info.layer} object`);
                }
                cells.set(key, { object: placed, mark: info.footprint[dy][dx] });
            }
        }
    }

    const placedBuildings = buildings.map((b) => Object.freeze({ ...b, config: b.config && resolveBuildingConfig(b.config) }));
    for (const placed of placedBuildings) {
        const box = buildingBox(placed.config);
        const footprint = buildingFootprint(placed.config);
        if (
            !Number.isInteger(placed.x) || !Number.isInteger(placed.y) ||
            placed.x < 0 || placed.y < 0 || placed.x + box.width > tilesWide || placed.y + box.height > tilesHigh
        ) {
            throw new Error(`A building at (${placed.x}, ${placed.y}) does not fit in the map`);
        }
        for (let dy = 0; dy < box.height; dy += 1) {
            for (let dx = 0; dx < box.width; dx += 1) {
                const key = (placed.y + dy) * tilesWide + placed.x + dx;
                if (index.standing.has(key)) throw new Error(`A building at (${placed.x}, ${placed.y}) overlaps another standing object or building`);
                index.standing.set(key, { building: placed, mark: footprint[dy][dx] });
            }
        }
    }

    const map: TileMap = Object.freeze({
        tileset,
        rows: Object.freeze([...rows]),
        // A hex colour is kept as lowercase `#rrggbb`.
        buildings: Object.freeze(placedBuildings),
        objects: Object.freeze(objects.map((o) => (o.color === undefined || objectColors[o.id]?.includes(o.color as ColorName) ? o : { ...o, color: parseHex(o.color)! }))),
        width,
        height: rows.length
    });
    occupancy.set(map, index);
    return map;
}

/** Size of the map in tiles. */
export function mapTileSize(map: TileMap): { width: number; height: number } {
    return { width: map.width * map.tileset.blockSize, height: map.height * map.tileset.blockSize };
}

/** The terrain tile at tile coordinates (tx, ty), or undefined outside the map. */
export function tileAt(map: TileMap, tx: number, ty: number): TileId | undefined {
    const size = map.tileset.blockSize;
    if (!Number.isInteger(tx) || !Number.isInteger(ty) || tx < 0 || ty < 0) return undefined;
    const row = map.rows[Math.floor(ty / size)];
    if (row === undefined) return undefined;
    const ch = row[Math.floor(tx / size)];
    if (ch === undefined) return undefined;
    return map.tileset.blocks[ch][ty % size][tx % size];
}

/** Terrain and object behaviour of the cell at tile coordinates (tx, ty), or undefined outside the map. */
export function queryCell(map: TileMap, tx: number, ty: number): CellInfo | undefined {
    const tile = tileAt(map, tx, ty);
    if (tile === undefined) return undefined;
    const { solid, water, grass } = map.tileset;
    const index = occupancy.get(map);
    const key = ty * mapTileSize(map).width + tx;
    const standing = index?.standing.get(key);
    const ground = index?.ground.get(key);
    const info = standing?.object && objectInfo[standing.object.id];
    return {
        tile,
        object: (standing ?? ground)?.object?.id,
        building: standing?.building,
        solid: solid.has(tile) || standing?.mark === "#",
        water: water.has(tile),
        grass: grass.has(tile),
        counter: info?.counter === true,
        door: info?.door === true || standing?.mark === "D"
    };
}

const rendered = new WeakMap<TileMap, Map<string, Raster>>();

/**
 * Renders the whole map to one raster (16 px per tile) in a fixed tile palette
 * (`tileThemes`). Memoised per map object and palette. Unknown palettes fall
 * back to summer. Seasonal objects (trees, flowers) change with it. `colors` recolours
 * groups of the palette with hex colours (`tileColorGroups`).
 */
export function buildMap(map: TileMap, theme?: string, colors?: TileColors): Raster {
    const resolved = resolveTheme(theme);
    const custom = tileColorsKey(colors);
    const cacheKey = `${resolved}|${custom}`;
    let byTheme = rendered.get(map);
    if (!byTheme) {
        byTheme = new Map();
        rendered.set(map, byTheme);
    }
    let raster = byTheme.get(cacheKey);
    if (!raster) {
        const slots = themeSlots(resolved, colors);
        const size = map.tileset.blockSize;
        const layers: Layer[] = [];
        for (let by = 0; by < map.height; by += 1) {
            for (let bx = 0; bx < map.width; bx += 1) {
                const block = map.tileset.blocks[map.rows[by][bx]];
                for (let ty = 0; ty < size; ty += 1) {
                    for (let tx = 0; tx < size; tx += 1) {
                        layers.push({
                            sprite: tileSprite(block[ty][tx]),
                            slots,
                            x: (bx * size + tx) * TILE_SIZE,
                            y: (by * size + ty) * TILE_SIZE
                        });
                    }
                }
            }
        }
        // Ground objects first, then standing ones and buildings from back to front so that a
        // tall object (a tree, a house) covers whatever stands behind it.
        const drawables = [
            ...map.objects.map((o) => ({ standing: objectInfo[o.id].layer === "standing", bottom: o.y + objectInfo[o.id].height, x: o.x, layers: () => objectLayers(o.id, o.x * TILE_SIZE, o.y * TILE_SIZE, resolved, o.color, o.damage, o) })),
            ...map.buildings.map((b) => ({ standing: true, bottom: b.y + buildingBox(b.config).height, x: b.x, layers: () => buildingLayers(b.config, b.x * TILE_SIZE, b.y * TILE_SIZE) }))
        ].sort((a, b) => Number(a.standing) - Number(b.standing) || a.bottom - b.bottom || a.x - b.x);
        for (const drawable of drawables) layers.push(...drawable.layers());
        const { width, height } = mapTileSize(map);
        raster = composeSprites(layers, { x: 0, y: 0, width: width * TILE_SIZE, height: height * TILE_SIZE });
        byTheme.set(cacheKey, raster);
    }
    return raster;
}

/** One thing that stands on the ground, drawn on its own so a game can put a walker in front of or behind it. */
export interface MapDrawable {
    readonly raster: Raster;
    /** World pixel of the raster's top-left corner. */
    readonly x: number;
    readonly y: number;
    /**
     * The world pixel row its footprint ends on. Draw it after anything whose feet are above this row and before anything
     * whose feet are at or below it, so a building covers a walker behind it and a walker in front covers the building.
     */
    readonly sortY: number;
}

export interface MapDrawables {
    /** The terrain and the ground objects (rugs, flowers): always drawn first. Same size as `buildMap`'s raster. */
    readonly ground: Raster;
    /** Standing objects and buildings, back to front. */
    readonly standing: readonly MapDrawable[];
}

const drawablesCache = new WeakMap<TileMap, Map<string, MapDrawables>>();

/**
 * The map split for drawing with walkers between its parts: the ground, then each standing object and building as its
 * own raster with the row it sorts on. Drawn in this order with nothing between them it looks the same as `buildMap`.
 * Memoised per map, palette and colours.
 */
export function mapDrawables(map: TileMap, theme?: string, colors?: TileColors): MapDrawables {
    const resolved = resolveTheme(theme);
    const cacheKey = `${resolved}|${tileColorsKey(colors)}`;
    let byTheme = drawablesCache.get(map);
    if (!byTheme) {
        byTheme = new Map();
        drawablesCache.set(map, byTheme);
    }
    let found = byTheme.get(cacheKey);
    if (!found) {
        const slots = themeSlots(resolved, colors);
        const size = map.tileset.blockSize;
        const layers: Layer[] = [];
        for (let by = 0; by < map.height; by += 1) {
            for (let bx = 0; bx < map.width; bx += 1) {
                const block = map.tileset.blocks[map.rows[by][bx]];
                for (let ty = 0; ty < size; ty += 1) {
                    for (let tx = 0; tx < size; tx += 1) {
                        layers.push({ sprite: tileSprite(block[ty][tx]), slots, x: (bx * size + tx) * TILE_SIZE, y: (by * size + ty) * TILE_SIZE });
                    }
                }
            }
        }
        const standing: (MapDrawable & { readonly x0: number })[] = [];
        for (const o of map.objects) {
            const info = objectInfo[o.id];
            const objectLayer = objectLayers(o.id, o.x * TILE_SIZE, o.y * TILE_SIZE, resolved, o.color, o.damage, o);
            if (info.layer === "ground") {
                layers.push(...objectLayer);
                continue;
            }
            const bounds = layerBounds(objectLayer);
            standing.push({ raster: composeSprites(objectLayer, bounds), x: bounds.x, y: bounds.y, sortY: (o.y + info.height) * TILE_SIZE, x0: o.x });
        }
        for (const b of map.buildings) {
            const buildingLayer = buildingLayers(b.config, b.x * TILE_SIZE, b.y * TILE_SIZE);
            const bounds = layerBounds(buildingLayer);
            standing.push({ raster: composeSprites(buildingLayer, bounds), x: bounds.x, y: bounds.y, sortY: (b.y + buildingBox(b.config).height) * TILE_SIZE, x0: b.x });
        }
        standing.sort((a, b) => a.sortY - b.sortY || a.x0 - b.x0);
        const { width, height } = mapTileSize(map);
        const ground = composeSprites(layers, { x: 0, y: 0, width: width * TILE_SIZE, height: height * TILE_SIZE });
        found = { ground, standing: standing.map(({ raster, x, y, sortY }) => ({ raster, x, y, sortY })) };
        byTheme.set(cacheKey, found);
    }
    return found;
}
