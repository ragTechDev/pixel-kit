import { composeSprites, layerBounds } from "../core/compose";
import { objectInfo, objectLayers } from "./objects/objects";
import { buildingVolumes } from "./buildings/volumes";
import { resolveBuildingConfig } from "./buildings/config";
import { doorColumn } from "./buildings/facade";
import { makeFrame, volumeBox } from "./buildings/frame";
import { queryCell, mapTileSize, type TileMap } from "./map";
import { TILE_SIZE } from "./size";

/** A rectangle in world pixels. */
export interface Box {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

interface Boxes {
    readonly solid: readonly Box[];
    readonly doors: readonly Box[];
}

const cache = new WeakMap<TileMap, Boxes>();

function compute(map: TileMap): Boxes {
    const solid: Box[] = [];
    const doors: Box[] = [];
    const { width, height } = mapTileSize(map);

    // Terrain and standing objects fill whole tiles. A run of solid tiles along a row is one box.
    for (let ty = 0; ty < height; ty += 1) {
        let runStart = -1;
        const close = (end: number) => {
            if (runStart >= 0) solid.push({ x: runStart * TILE_SIZE, y: ty * TILE_SIZE, width: (end - runStart) * TILE_SIZE, height: TILE_SIZE });
            runStart = -1;
        };
        for (let tx = 0; tx < width; tx += 1) {
            const cell = queryCell(map, tx, ty)!;
            // Only the terrain is whole tiles. A building's cells are covered by its drawn wall below, and an object's by what is drawn of it.
            const wall = !cell.building && map.tileset.solid.has(cell.tile) && !cell.door;
            if (!cell.building && cell.door) doors.push({ x: tx * TILE_SIZE, y: ty * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE });
            if (wall && runStart < 0) runStart = tx;
            if (!wall) close(tx);
        }
        close(width);
    }

    // A standing object is solid where it is drawn inside the cells its footprint blocks: a tree trunk is as wide as the trunk, not the tile.
    for (const placed of map.objects) {
        const info = objectInfo[placed.id];
        if (info.layer !== "standing") continue;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        info.footprint.forEach((row, dy) => {
            for (let dx = 0; dx < row.length; dx += 1) {
                if (row[dx] !== "#") continue;
                minX = Math.min(minX, dx);
                maxX = Math.max(maxX, dx + 1);
                minY = Math.min(minY, dy);
                maxY = Math.max(maxY, dy + 1);
            }
        });
        if (minX === Infinity) continue;
        const area = { x: (placed.x + minX) * TILE_SIZE, y: (placed.y + minY) * TILE_SIZE, width: (maxX - minX) * TILE_SIZE, height: (maxY - minY) * TILE_SIZE };
        const layers = objectLayers(placed.id, placed.x * TILE_SIZE, placed.y * TILE_SIZE, undefined, placed.color);
        const bounds = layerBounds(layers);
        const raster = composeSprites(layers, bounds);
        let x0 = Infinity;
        let y0 = Infinity;
        let x1 = -Infinity;
        let y1 = -Infinity;
        for (let sy = 0; sy < raster.height; sy += 1) {
            const y = bounds.y + sy;
            if (y < area.y || y >= area.y + area.height) continue;
            for (let sx = 0; sx < raster.width; sx += 1) {
                const x = bounds.x + sx;
                if (x < area.x || x >= area.x + area.width || raster.px[sy * raster.width + sx] === 0) continue;
                x0 = Math.min(x0, x);
                y0 = Math.min(y0, y);
                x1 = Math.max(x1, x + 1);
                y1 = Math.max(y1, y + 1);
            }
        }
        // Nothing drawn there (a blank mask): keep the whole cells.
        solid.push(x0 === Infinity ? area : { x: x0, y: y0, width: x1 - x0, height: y1 - y0 });
    }

    // A building is solid where its wall is drawn, from the outline on either side down to the ground line. The roof rows above it
    // are open, so something can walk up behind the building and be covered by its roof. The foot of the door is left open.
    for (const placed of map.buildings) {
        const config = resolveBuildingConfig(placed.config);
        for (const volume of buildingVolumes(config)) {
            const frame = makeFrame(volume.config, volume.x * TILE_SIZE);
            const left = placed.x * TILE_SIZE + volume.x * TILE_SIZE + frame.wx0;
            const right = placed.x * TILE_SIZE + volume.x * TILE_SIZE + frame.wx1;
            const top = placed.y * TILE_SIZE + volume.y * TILE_SIZE + frame.yw;
            const bottom = placed.y * TILE_SIZE + volume.y * TILE_SIZE + volumeBox(volume.config).height * TILE_SIZE;
            if (!volume.door) {
                solid.push({ x: left, y: top, width: right - left, height: bottom - top });
                continue;
            }
            const doorLeft = placed.x * TILE_SIZE + (volume.x + doorColumn(volume.config)) * TILE_SIZE;
            const doorRight = doorLeft + TILE_SIZE;
            const doorTop = bottom - TILE_SIZE;
            doors.push({ x: doorLeft, y: doorTop, width: TILE_SIZE, height: TILE_SIZE });
            if (doorLeft > left) solid.push({ x: left, y: top, width: doorLeft - left, height: bottom - top });
            if (right > doorRight) solid.push({ x: doorRight, y: top, width: right - doorRight, height: bottom - top });
            if (doorTop > top) solid.push({ x: doorLeft, y: top, width: TILE_SIZE, height: doorTop - top });
        }
    }
    return { solid: Object.freeze(solid), doors: Object.freeze(doors) };
}

function boxes(map: TileMap): Boxes {
    let found = cache.get(map);
    if (!found) {
        found = compute(map);
        cache.set(map, found);
    }
    return found;
}

/**
 * Where something cannot go, in world pixels, for movement that is not tied to tiles. Solid terrain and water are
 * whole tiles; a standing object is the part of it drawn on its blocking cells (a tree is its trunk); a building is its drawn wall, so a walker can come right up to its outline on
 * the sides and the front. The roof rows above the wall are open: walk up behind a building and it covers you
 * (see `mapDrawables`). The foot of a door is open (see `doorBoxes`).
 */
export function solidBoxes(map: TileMap): readonly Box[] {
    return boxes(map).solid;
}

/** The open cells that warp, in world pixels: door objects and the foot of each building's door. */
export function doorBoxes(map: TileMap): readonly Box[] {
    return boxes(map).doors;
}
