import type { BuildingConfig, ResolvedBuildingConfig, RoofShape, VolumeConfig } from "./config";
import { buildingDepths, resolveBuildingConfig } from "./config";
import { volumeBox } from "./frame";
import type { RoofKind } from "./roof";

// A building is one volume, or two when it has a wing, each drawn on its own (its wall, roof and facade) and placed in the
// picture. A front wing is a narrower volume in the middle that sticks out two tiles in front of the main part, closer to you,
// so it is drawn lower and over it; it has the door. A side wing is a lower, one-storey volume beside the main part, which is
// then two storeys tall and has the door. The two are set against each other, each with a complete roof, and their walls run
// out to the join (`joined` in the volume's config) so the ground floor is one wall across it.

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
    // The part behind has no door, and the barrels are at the wing's door; the flower boxes stay under the windows of the main part.
    const main: VolumeConfig = { ...c, wing: "none", porch: "none", props: c.props === "barrels" ? "none" : c.props };
    const wing: VolumeConfig = {
        ...c,
        wing: "none",
        width,
        storeys: 1,
        // A step longer than the main part, so its roof rises over the eave of the roof behind it.
        depth: longer(c),
        windows: c.windows === "none" ? "none" : "some",
        door: "centre",
        roof: wingRoofs[c.roof],
        chimney: "none",
        props: c.props === "planters" ? "none" : c.props
    };
    const total = volumeBox(main).height + WING_TILES;
    return [
        { config: main, roof: mainRoofs[c.roof], door: false, x: 0, y: 0 },
        { config: wing, roof: wing.roof, door: true, x: (c.width - width) / 2, y: total - volumeBox(wing).height }
    ];
}

function sideWing(c: ResolvedBuildingConfig, side: "left" | "right"): Volume[] {
    const annexWidth = c.width >= 7 ? 3 : 2;
    // The taller part has the door and always two storeys; the lower part beside it has one and no door. Each is a whole
    // building with a complete roof, set against the other, and their walls run out to the join, so the ground floor
    // wall is one wall across it.
    const tall: VolumeConfig = { ...c, wing: "none", width: c.width - annexWidth, storeys: 2, door: "centre", joined: side === "left" ? { left: true, right: false } : { left: false, right: true } };
    const low: VolumeConfig = {
        ...c,
        wing: "none",
        width: annexWidth,
        storeys: 1,
        roof: wingRoofs[c.roof],
        chimney: "none",
        porch: "none",
        props: c.props === "barrels" ? "none" : c.props,
        joined: side === "left" ? { left: false, right: true } : { left: true, right: false }
    };
    const lowY = volumeBox(tall).height - volumeBox(low).height;
    return side === "left"
        ? [
              { config: low, roof: low.roof, door: false, x: 0, y: lowY },
              { config: tall, roof: tall.roof, door: true, x: annexWidth, y: 0, sideWall: "left" }
          ]
        : [
              { config: low, roof: low.roof, door: false, x: tall.width, y: lowY },
              { config: tall, roof: tall.roof, door: true, x: 0, y: 0, sideWall: "right" }
          ];
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
