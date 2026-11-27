import { composeSprites, type Layer, type Raster } from "../../core/compose";
import { TILE_SIZE } from "../size";
import { buildingKey, resolveBuildingConfig, type BuildingConfig, type ResolvedBuildingConfig } from "./config";
import { doorColumn, drawFacade } from "./facade";
import { buildingBox, makeFrame } from "./frame";
import { drawChimney, drawRoof } from "./roof";
import { drawWall } from "./wall";

// A building is drawn from its config in code, back to front: the wall, the roof (with its gable), the chimney, then
// the facade on the wall. The roof is in `roof.ts`, the wall in `wall.ts` and the facade in `facade.ts`; the parts that
// are one fixed size are masks (`parts.ts`). The picture is a whole number of tiles, with the ground on its bottom row.

export { buildingBox } from "./frame";

/**
 * The tiles a building covers and what is solid: `#` is a wall or roof, `.` is open and `D` is the door
 * cell at the foot of the door, where a walker can step in. One string per tile row.
 */
export function buildingFootprint(config?: BuildingConfig): readonly string[] {
    const c = resolveBuildingConfig(config);
    const { width, height } = buildingBox(c);
    const door = doorColumn(c);
    return Array.from({ length: height }, (_, y) => (y === height - 1 ? "#".repeat(door) + "D" + "#".repeat(width - door - 1) : "#".repeat(width)));
}

function draw(c: ResolvedBuildingConfig): Layer[] {
    const frame = makeFrame(c);
    return [...drawWall(frame), ...drawRoof(frame), ...drawChimney(frame), ...drawFacade(frame)];
}

const drawn = new Map<string, readonly Layer[]>();

/** Internal: the layers of a building with its box's top-left corner at pixel (px, py). */
export function buildingLayers(config: BuildingConfig | undefined, px: number, py: number): Layer[] {
    const c = resolveBuildingConfig(config);
    const key = buildingKey(c);
    let layers = drawn.get(key);
    if (!layers) {
        layers = draw(c);
        if (drawn.size > 256) drawn.clear();
        drawn.set(key, layers);
    }
    return layers.map((layer) => ({ ...layer, x: layer.x + px, y: layer.y + py }));
}

const built = new Map<string, Raster>();

/**
 * Returns the (memoised) raster for a building, a whole number of tiles wide and tall (16 px per tile). The
 * bottom row of the picture is the ground the building stands on.
 */
export function buildBuilding(config?: BuildingConfig): Raster {
    const c = resolveBuildingConfig(config);
    const key = buildingKey(c);
    let raster = built.get(key);
    if (!raster) {
        const box = buildingBox(c);
        raster = composeSprites(buildingLayers(c, 0, 0), { x: 0, y: 0, width: box.width * TILE_SIZE, height: box.height * TILE_SIZE });
        if (built.size > 256) built.clear();
        built.set(key, raster);
    }
    return raster;
}
