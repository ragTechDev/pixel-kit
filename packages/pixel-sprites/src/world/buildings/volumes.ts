import type { BuildingConfig, ResolvedBuildingConfig, RoofShape, VolumeConfig } from "./config";
import { buildingDepths, resolveBuildingConfig } from "./config";
import { volumeBox } from "./frame";
import { TILE_SIZE } from "../size";
import type { RoofKind } from "./roof";

// A building is one volume, or two when it has a wing, each drawn on its own (its wall, roof and facade) and placed in the
// picture. The main part has `storeys` and the wing has `wingStoreys`. A front wing is a narrower volume in the middle that
// sticks out two tiles in front of the main part, closer to you, so it is drawn lower and over it; it has the door. A side wing
// is a volume beside the main part, which has the door; whichever of the two is taller has the corner line down beside the other.
// The two are set against each other, each with a complete roof, and their walls run out to the join (`joined` in the volume's
// config) so the ground floor is one wall across it.

/** One volume of a building: what to draw, and where its top-left tile is in the picture. */
export interface Volume {
    readonly config: VolumeConfig;
    readonly roof: RoofKind;
    /** Whether it has the building's door. */
    readonly door: boolean;
    readonly x: number;
    readonly y: number;
    /** The side of a taller volume that has a lower one against it, where a line runs down its corner beside the lower roof. */
    readonly sideWall?: "left" | "right";
}

/** How many tiles a front wing sticks out in front of the rest of the building. */
export const WING_TILES = 2;

/** The roof of a wing for each roof of the building. Roofs that do not make a wing of their own take a gable or a hip. */
const wingRoofs: Record<RoofShape, RoofShape> = { gable: "gable", hip: "hip", hipFlat: "hip", mansard: "hip", gambrel: "gable", saltbox: "gable", flat: "flat" };

/** The roof of the part behind a front wing: a gable roof turns so its ridge runs across, and the rest are as they are. */
const mainRoofs: Record<RoofShape, RoofKind> = { gable: "sideGable", saltbox: "sideGable", hip: "hip", hipFlat: "hipFlat", mansard: "mansard", gambrel: "gambrel", flat: "flat" };

const longer = (c: ResolvedBuildingConfig) => buildingDepths[Math.min(buildingDepths.indexOf(c.depth) + 1, buildingDepths.length - 1)];

function frontWing(c: ResolvedBuildingConfig): Volume[] {
    // Narrower than the building by two tiles on each side, or one if that would leave less than three.
    const width = c.width - 4 >= 3 ? c.width - 4 : c.width - 2;
    const margin = ((c.width - width) / 2) * TILE_SIZE;
    // The chimney stands in the middle of the margin beside the wing, where the roof behind shows, not under the wing's roof.
    const chimneyAt = c.chimney === "left" ? Math.round(margin / 2) : Math.round(c.width * TILE_SIZE - margin / 2);
    // The part behind has no door, and the barrels are at the wing's door; the flower boxes stay under the windows of the main part.
    const main: VolumeConfig = { ...c, wing: "none", porch: "none", props: c.props === "barrels" ? "none" : c.props, chimneyAt };
    const wing: VolumeConfig = {
        ...c,
        wing: "none",
        width,
        storeys: c.wingStoreys,
        // A step longer than the main part, so its roof rises over the eave of the roof behind it.
        depth: longer(c),
        windows: Math.min(c.windows, 2),
        door: "centre",
        roof: wingRoofs[c.roof],
        chimney: "none",
        props: c.props === "planters" ? "none" : c.props
    };
    const mainHeight = volumeBox(main).height;
    const wingHeight = volumeBox(wing).height;
    // The wing sticks out in front of the main part; if it is taller than that, the main part sits lower in the picture.
    const total = Math.max(mainHeight + WING_TILES, wingHeight);
    return [
        { config: main, roof: mainRoofs[c.roof], door: false, x: 0, y: total - WING_TILES - mainHeight },
        { config: wing, roof: wing.roof, door: true, x: (c.width - width) / 2, y: total - wingHeight }
    ];
}

function sideWing(c: ResolvedBuildingConfig, side: "left" | "right"): Volume[] {
    const wingWidth = c.width >= 7 ? 3 : 2;
    // The main part has the door and `storeys`; the wing beside it has `wingStoreys`. Each is a whole building with a complete
    // roof, set against the other, and their walls run out to the join (`joined`) so the ground floor is one wall across it.
    const main: VolumeConfig = { ...c, wing: "none", width: c.width - wingWidth, door: "centre", joined: side === "left" ? { left: true, right: false } : { left: false, right: true } };
    const wing: VolumeConfig = {
        ...c,
        wing: "none",
        width: wingWidth,
        storeys: c.wingStoreys,
        roof: wingRoofs[c.roof],
        chimney: "none",
        porch: "none",
        props: c.props === "barrels" ? "none" : c.props,
        joined: side === "left" ? { left: false, right: true } : { left: true, right: false }
    };
    const mainHeight = volumeBox(main).height;
    const wingHeight = volumeBox(wing).height;
    const total = Math.max(mainHeight, wingHeight);
    const mainVolume: Volume = { config: main, roof: main.roof, door: true, x: side === "left" ? wingWidth : 0, y: total - mainHeight };
    const wingVolume: Volume = { config: wing, roof: wing.roof, door: false, x: side === "left" ? 0 : main.width, y: total - wingHeight };
    // The taller part has the corner line down beside the lower one's roof, on the side the lower one is on. Equal heights have no step.
    if (mainHeight > wingHeight) return [wingVolume, { ...mainVolume, sideWall: side }];
    if (wingHeight > mainHeight) return [mainVolume, { ...wingVolume, sideWall: side === "left" ? "right" : "left" }];
    return [wingVolume, mainVolume];
}

/** The volumes of a building, back to front. */
export function buildingVolumes(c: ResolvedBuildingConfig): Volume[] {
    if (c.wing === "front") return frontWing(c);
    if (c.wing === "left" || c.wing === "right") return sideWing(c, c.wing);
    return [{ config: c, roof: c.roof, door: true, x: 0, y: 0 }];
}

/** The size of a building in tiles: its width, its height and how many rows of its first volume are roof. */
export function buildingBox(config?: BuildingConfig): { width: number; height: number; roofTiles: number } {
    const c = resolveBuildingConfig(config);
    const volumes = buildingVolumes(c);
    return { width: c.width, height: Math.max(...volumes.map((v) => v.y + volumeBox(v.config).height)), roofTiles: volumeBox(volumes[0].config).roofTiles };
}
