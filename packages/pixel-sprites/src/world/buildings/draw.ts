import { composeSprites, type Layer, type Raster } from "../../core/compose";
import { SLOT } from "../../core/sprite";
import { TILE_SIZE } from "../size";
import { buildingKey, resolveBuildingConfig, type BuildingConfig, type ResolvedBuildingConfig, type VolumeConfig } from "./config";
import { doorColumn, drawFacade } from "./facade";
import { makeFrame, volumeBox } from "./frame";
import { drawChimney, drawRoof, type RoofKind } from "./roof";
import { addRect, flat, shape } from "./shapes";
import { drawWall } from "./wall";
import { buildingBox, buildingVolumes, type Volume } from "./volumes";

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

/**
 * Opens the edge of a volume's wall where it carries on into the volume beside it: the outline there is dropped and the lit
 * and shaded edge become plain wall, so the two walls touch and are one wall. Only the shaded base of each part has an
 * edge (the layers over it, the brick or the boards, have none).
 */
function openJoinedEdges(layers: Layer[], width: number, joined: NonNullable<VolumeConfig["joined"]>): Layer[] {
    return layers.map((layer) => {
        const { sprite } = layer;
        if (!sprite.px.includes(SLOT.outline)) return layer;
        const px = new Uint8Array(sprite.px);
        for (let sy = 0; sy < sprite.height; sy += 1) {
            for (let sx = 0; sx < sprite.width; sx += 1) {
                const x = layer.x + sprite.originX + sx;
                const onRight = joined.right && x >= width - 1;
                if (!onRight && !(joined.left && x <= 0)) continue;
                const slot = px[sy * sprite.width + sx];
                if (slot === SLOT.outline) {
                    px[sy * sprite.width + sx] = 0;
                } else if (slot === SLOT.shadow || slot === SLOT.highlight) {
                    // A lit or shaded pixel with another of the same beside it, further in, is part of the top or bottom edge, which carries on across the join.
                    const inward = px[sy * sprite.width + sx + (onRight ? -1 : 1)];
                    if (inward !== slot) px[sy * sprite.width + sx] = SLOT.base;
                }
            }
        }
        return { ...layer, sprite: { ...sprite, px } };
    });
}

function drawVolume(c: VolumeConfig, roof: RoofKind, door: boolean, x: number): Layer[] {
    const frame = makeFrame(c, x * TILE_SIZE);
    const wall = drawWall(frame);
    return [...(c.joined ? openJoinedEdges(wall, frame.W, c.joined) : wall), ...drawRoof(frame, roof), ...drawChimney(frame, roof), ...drawFacade(frame, { door })];
}

/**
 * The corner where a taller volume comes down beside a lower one: a thin line straight down the wall, starting right under the
 * lower roof, which goes a pixel past it, to the foundation. It is a dark line along the join with a line of the wall's shadow tone
 * next to it, on the side of the lower volume.
 */
function drawSideLine(c: ResolvedBuildingConfig, tall: Volume, low: Volume, side: "left" | "right"): Layer[] {
    const box = buildingBox(c);
    const tallFrame = makeFrame(tall.config, tall.x * TILE_SIZE);
    const lowFrame = makeFrame(low.config, low.x * TILE_SIZE);
    const join = side === "left" ? tall.x * TILE_SIZE : (tall.x + tall.config.width) * TILE_SIZE;
    const y0 = low.y * TILE_SIZE + lowFrame.yb;
    const y1 = low.y * TILE_SIZE + lowFrame.H - 4;
    const dark = side === "left" ? join - 1 : join;
    const shade = side === "left" ? join - 2 : join + 1;
    const here = () => shape(box.width * TILE_SIZE, box.height * TILE_SIZE);
    return [
        ...flat(addRect(here(), dark, y0, dark + 1, y1), tallFrame.ramps.wall, SLOT.outline),
        ...flat(addRect(here(), shade, y0, shade + 1, y1), tallFrame.ramps.wall, SLOT.shadow)
    ];
}

function draw(c: ResolvedBuildingConfig): Layer[] {
    const volumes = buildingVolumes(c);
    return volumes.flatMap((v) => {
        const dx = v.x * TILE_SIZE;
        const dy = v.y * TILE_SIZE;
        const layers = drawVolume(v.config, v.roof, v.door, v.x).map((layer) => ({ ...layer, x: layer.x + dx, y: layer.y + dy }));
        // The side wall is drawn after the lower volume and before the taller one, so the taller one's roof and corner are over it.
        const low = volumes.find((other) => other !== v);
        // The line is drawn over the lower volume, before the taller one.
        return v.sideWall && low ? [...drawSideLine(c, v, low, v.sideWall), ...layers] : layers;
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
