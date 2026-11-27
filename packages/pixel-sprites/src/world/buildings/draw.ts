import { composeSprites, type Layer, type Raster } from "../../core/compose";
import { TILE_SIZE } from "../size";
import { buildingKey, resolveBuildingConfig, type BuildingConfig, type ResolvedBuildingConfig, type VolumeConfig } from "./config";
import { doorColumn, drawFacade } from "./facade";
import { buildingBox, makeFrame, volumeBox } from "./frame";
import { drawChimney, drawRoof, type RoofKind } from "./roof";
import { drawWall } from "./wall";
import { wingParts } from "./wing";

// A building is drawn from its config in code, back to front: the wall, the roof (with its gable), the chimney, then
// the facade on the wall. The roofs are in `roof/`, the wall in `wall.ts` and the facade in `facade.ts`; the parts that
// are one fixed size are masks (`parts.ts`). A building with a front wing is two such volumes (`wing.ts`). The picture is a
// whole number of tiles, with the ground on its bottom row.

export { buildingBox } from "./frame";

/**
 * The tiles a building covers and what is solid: `#` is a wall or roof, `.` is open and `D` is the door
 * cell at the foot of the door, where a walker can step in. One string per tile row. Beside a front wing the
 * rows in front of the main part are open.
 */
export function buildingFootprint(config?: BuildingConfig): readonly string[] {
    const c = resolveBuildingConfig(config);
    const { width, height } = buildingBox(c);
    const wing = c.wing === "front" ? wingParts(c) : undefined;
    const left = wing ? wing.wingX : 0;
    const right = wing ? wing.wingX + wing.wing.width : width;
    const door = wing ? wing.wingX + doorColumn(wing.wing) : doorColumn(c);
    // The main part covers its own rows; the wing sticks out below them.
    const mainRows = wing ? volumeBox(wing.main).height : height;
    return Array.from({ length: height }, (_, y) => {
        const inMain = y < mainRows;
        const cells: string[] = Array.from({ length: width }, (_, x) => (inMain || (x >= left && x < right) ? "#" : "."));
        if (y === height - 1) cells[door] = "D";
        return cells.join("");
    });
}

function drawVolume(c: VolumeConfig, roof: RoofKind, door: boolean): Layer[] {
    const frame = makeFrame(c);
    return [...drawWall(frame), ...drawRoof(frame, roof), ...drawChimney(frame, roof), ...drawFacade(frame, { door })];
}

function draw(c: ResolvedBuildingConfig): Layer[] {
    if (c.wing === "none") return drawVolume(c, c.roof, true);
    const parts = wingParts(c);
    const wing = drawVolume(parts.wing, parts.wing.roof, true);
    const dx = parts.wingX * TILE_SIZE;
    const dy = parts.wingTop * TILE_SIZE;
    return [...drawVolume(parts.main, parts.mainRoof, false), ...wing.map((layer) => ({ ...layer, x: layer.x + dx, y: layer.y + dy }))];
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
