import type { ResolvedBuildingConfig, RoofShape, VolumeConfig } from "./config";
import { volumeBox, WING_TILES } from "./frame";
import type { RoofKind } from "./roof";

// A building with a front wing is two volumes: the main part behind, and a narrower wing in the middle that sticks out
// in front of it, closer to you, so it is drawn lower in the picture and over the main part. The wing has the door and the
// same walls and colours, and its roof is the same family as the main one, which is what makes a cross gable, a notched
// flat roof or a rounded front. The part behind has its own roof, with the wing's roof rising in front of it.

/** The roof of the wing for each roof of the building. Roofs that do not make a wing of their own take a gable or a hip. */
const wingRoofs: Record<RoofShape, RoofShape> = { gable: "gable", hip: "hip", hipFlat: "hip", mansard: "hip", gambrel: "gable", saltbox: "gable", flat: "flat", barrel: "barrel" };

/** The roof of the part behind the wing: a gable roof turns so its ridge runs across, and the rest are as they are. */
const mainRoofs: Record<RoofShape, RoofKind> = { gable: "sideGable", saltbox: "sideGable", hip: "hip", hipFlat: "hipFlat", mansard: "mansard", gambrel: "gambrel", flat: "flat", barrel: "barrel" };

export interface WingParts {
    readonly main: VolumeConfig;
    readonly mainRoof: RoofKind;
    readonly wing: VolumeConfig;
    /** The wing's left edge in tiles, and its top in tiles from the top of the picture. */
    readonly wingX: number;
    readonly wingTop: number;
}

export function wingParts(c: ResolvedBuildingConfig): WingParts {
    // Narrower than the building by two tiles on each side, or one if that would leave less than three.
    const width = (c.width - 4 >= 3 ? c.width - 4 : c.width - 2);
    // The part behind has no door, and the barrels are at the wing's door; the flower boxes stay under the windows of the main part.
    const main: VolumeConfig = { ...c, wing: "none", porch: "none", props: c.props === "barrels" ? "none" : c.props };
    const wing: VolumeConfig = {
        ...c,
        wing: "none",
        width,
        storeys: 1,
        depth: "short",
        windows: c.windows === "none" ? "none" : "some",
        door: "centre",
        roof: wingRoofs[c.roof],
        chimney: "none",
        props: c.props === "planters" ? "none" : c.props
    };
    const total = volumeBox(main).height + WING_TILES;
    return { main, mainRoof: mainRoofs[c.roof], wing, wingX: (c.width - width) / 2, wingTop: total - volumeBox(wing).height };
}
