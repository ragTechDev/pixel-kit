import { composeSprites, type Layer, type Raster } from "../../core/compose";
import { SLOT } from "../../core/sprite";
import { TILE_SIZE } from "../size";
import { buildingKey, resolveBuildingConfig, type BuildingConfig, type ResolvedBuildingConfig, type VolumeConfig } from "./config";
import { doorColumn, drawFacade } from "./facade";
import { makeFrame, volumeBox } from "./frame";
import { drawChimney, drawRoof, type RoofKind } from "./roof";
import { drawWall } from "./wall";
import { buildingBox, buildingVolumes } from "./volumes";

// A building is drawn from its config in code, back to front: the wall, the roof (with its gable), the chimney, then
// the facade on the wall. The roofs are in `roof/`, the wall in `wall.ts` and the facade in `facade.ts`; the parts that
// are one fixed size are masks (`parts.ts`). A building with a wing is two such volumes (`volumes.ts`). The picture is a
// whole number of tiles, with the ground on its bottom row.

export { buildingBox } from "./volumes";

/**
 * The tiles a building covers and what is solid: `#` is a wall or roof, `.` is open and `D` is the door
 * cell at the foot of the door, where a walker can step in. One string per tile row. The rows beside a wing (in front of
 * the main part, or above a lower side wing) are open.
 */
export function buildingFootprint(config?: BuildingConfig): readonly string[] {
    const c = resolveBuildingConfig(config);
    const { width, height } = buildingBox(c);
    const cells = Array.from({ length: height }, () => Array<string>(width).fill("."));
    for (const v of buildingVolumes(c)) {
        const { height: h } = volumeBox(v.config);
        for (let y = v.y; y < v.y + h; y += 1) for (let x = v.x; x < v.x + v.config.width; x += 1) cells[y][x] = "#";
        if (v.door) cells[v.y + h - 1][v.x + doorColumn(v.config)] = "D";
    }
    return cells.map((row) => row.join(""));
}

function drawVolume(c: VolumeConfig, roof: RoofKind, door: boolean, x: number, joined: boolean): Layer[] {
    const frame = makeFrame(c, x * TILE_SIZE);
    let wall = drawWall(frame);
    if (joined) {
        // Over the wall of the lower volume it joins, the outline and the lit and shaded edges are left out, so the two walls are one wall.
        // Only the shaded base of each part has an edge (the layers over it, the brick or the boards, have no outline).
        const tones = [frame.ramps.wall, frame.ramps.stone, frame.ramps.wood].flatMap((ramp) => Object.values(ramp));
        wall = wall.map((layer) => (layer.sprite.px.includes(SLOT.outline) ? { ...layer, noOutlineOver: tones, noHighlightOver: tones, noShadowOver: tones } : layer));
    }
    return [...wall, ...drawRoof(frame, roof), ...drawChimney(frame, roof), ...drawFacade(frame, { door })];
}

function draw(c: ResolvedBuildingConfig): Layer[] {
    return buildingVolumes(c).flatMap((v) => {
        const dx = v.x * TILE_SIZE;
        const dy = v.y * TILE_SIZE;
        return drawVolume(v.config, v.roof, v.door, v.x, v.joined === true).map((layer) => ({ ...layer, x: layer.x + dx, y: layer.y + dy }));
    });
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
