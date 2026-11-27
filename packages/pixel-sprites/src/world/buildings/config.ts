import { colorRamps, type ColorName } from "../../core/colors";
import { parseHex, type HexColor } from "../../core/customColor";

/** How many tiles wide a building is. */
export const buildingWidths = [5, 6, 7, 8] as const;
/** How many storeys of wall a building has, or its wing (`wingStoreys`): one or two. */
export const buildingStoreys = [1, 2] as const;
/**
 * The shape of the roof, as it looks from above and in front:
 * - `gable`: a ridge running front to back, with the gable on the wall at the front.
 * - `hip`: the same ridge with a sloping face at the front, so the wall is a plain rectangle.
 * - `hipFlat`: a hip roof with a flat top, the front slope a trapezoid under it.
 * - `mansard`: a hipped roof with a flat top and a flared skirt at the eave.
 * - `gambrel`: a steep lower slope under a flatter upper one.
 * - `saltbox`: a gable whose ridge is off to one side, so one slope is long and one short.
 * - `flat`: a flat roof inside a thick parapet, as on a shop or a block of flats.
 */
export const roofShapes = ["gable", "hip", "hipFlat", "mansard", "gambrel", "saltbox", "flat"] as const;
/**
 * What is on the flat part of a roof, on the roofs that have one (`flat`, `hipFlat` and `mansard`): air conditioners and
 * vent pipes, a big air-handling unit, cardboard boxes, skylights, rows of solar panels, or a roof garden. The other roofs
 * have none of these.
 */
export const buildingRooftops = ["none", "vents", "machinery", "boxes", "skylights", "solar", "garden"] as const;
/**
 * A second section of the building. `front` sticks out at the front, in the middle, with the same kind of roof, so a gable
 * roof gets a cross gable and a flat one a notch. `left` and `right` are a second section beside the main part, which has the
 * door. The main part has `storeys` and the wing `wingStoreys`, so a wing lower than the main part makes a step in the roofline.
 */
export const buildingWings = ["none", "front", "left", "right"] as const;
/** How steep the roof is. A steep roof is one tile taller. */
export const roofPitches = ["low", "steep"] as const;
/** How long the building is from front to back. The picture is from above, so a longer building is a roof that goes further up: one more tile for each step. */
export const buildingDepths = ["short", "medium", "long", "longest"] as const;
/**
 * What the roof is covered with, on every roof but a flat one (which is a floor inside a parapet): `shingle` (slate-grey
 * overlapping rows), `ceramic` (terracotta barrel tiles), `thatch` (straw) or `wood` (shakes, rows of planks).
 */
export const roofMaterials = ["shingle", "ceramic", "thatch", "wood"] as const;
/** What the walls are made of. A timber wall is plaster between wooden beams. */
export const buildingWalls = ["clapboard", "brick", "stone", "timber"] as const;
/** Which tile column the door is in. */
export const doorPositions = ["left", "centre", "right"] as const;
export const doorStyles = ["plain", "arched"] as const;
/**
 * The most windows a storey can have, whatever the building: `windows` above this is brought down to it. What fits in a
 * particular building depends on its width and the window style (`maxWindows`).
 */
export const MAX_WINDOWS = 6;
export const windowStyles = ["plain", "arched", "shuttered"] as const;
/** What is at the door: nothing, stone steps, or a wooden deck across the front. */
export const porches = ["none", "steps", "deck"] as const;
export const chimneys = ["none", "left", "right"] as const;
/** Things at the front: nothing, barrels beside the door, or flower boxes under the ground floor windows. */
export const buildingProps = ["none", "barrels", "planters"] as const;
/** The common colours a building's roof, walls, trim and door can take. Any hex colour works too. */
export const buildingColors = Object.keys(colorRamps) as ColorName[];

export type BuildingWidth = (typeof buildingWidths)[number];
export type BuildingStoreys = (typeof buildingStoreys)[number];
export type RoofShape = (typeof roofShapes)[number];
export type BuildingRooftop = (typeof buildingRooftops)[number];
export type BuildingWing = (typeof buildingWings)[number];
export type RoofMaterial = (typeof roofMaterials)[number];
export type RoofPitch = (typeof roofPitches)[number];
export type BuildingDepth = (typeof buildingDepths)[number];
export type BuildingWall = (typeof buildingWalls)[number];
export type DoorPosition = (typeof doorPositions)[number];
export type DoorStyle = (typeof doorStyles)[number];
export type WindowStyle = (typeof windowStyles)[number];
export type Porch = (typeof porches)[number];
export type Chimney = (typeof chimneys)[number];
export type BuildingProps = (typeof buildingProps)[number];
export type BuildingColor = ColorName | HexColor;
/** The colour of a roof or wall: a common colour, a hex colour, or `"natural"`, the colour of the material itself (slate, terracotta, straw, brick and so on). */
export type MaterialColor = BuildingColor | "natural";

/**
 * A building is chosen from fixed lists, like an avatar, and drawn from them. It is seen from the front
 * and slightly above, the usual view of a house in a pixel-art game: a roof over a wall with a door and windows.
 * Anything that is not in a list falls back to its default (`resolveBuildingConfig`).
 */
export interface BuildingConfig {
    width?: BuildingWidth;
    storeys?: BuildingStoreys;
    /** How many storeys the wing has, when there is one. `storeys` is then the main part's, the part with the door (or, with a front wing, the part behind it). */
    wingStoreys?: BuildingStoreys;
    roof?: RoofShape;
    wing?: BuildingWing;
    rooftop?: BuildingRooftop;
    pitch?: RoofPitch;
    depth?: BuildingDepth;
    /** What the roof is covered with. Does not apply to a flat roof. */
    roofMaterial?: RoofMaterial;
    wall?: BuildingWall;
    door?: DoorPosition;
    doorStyle?: DoorStyle;
    /** How many windows each storey has, spaced evenly along the wall: 0 to `maxWindows(width, windowStyle)`, and no more than that however many are asked for. */
    windows?: number;
    windowStyle?: WindowStyle;
    porch?: Porch;
    chimney?: Chimney;
    props?: BuildingProps;
    /** A colour to paint the roof or walls, replacing the material's natural colour. The default is `"natural"`. */
    roofColor?: MaterialColor;
    wallColor?: MaterialColor;
    trimColor?: BuildingColor;
    doorColor?: BuildingColor;
}

export type ResolvedBuildingConfig = Required<BuildingConfig>;

/** What is drawn: a resolved config whose width may be any whole number of tiles, because the front wing of a building is narrower than the lists allow. */
export type VolumeConfig = Omit<ResolvedBuildingConfig, "width"> & {
    width: number;
    /** The edges where this volume carries on into the volume beside it: its wall runs out to the edge there, with no gap for the roof's overhang. */
    joined?: { readonly left: boolean; readonly right: boolean };
    /** Where the chimney stands, as its centre in pixels from the left of the volume, when it is not at its usual place. */
    chimneyAt?: number;
};

export const defaultBuildingConfig: ResolvedBuildingConfig = {
    width: 6,
    storeys: 1,
    wingStoreys: 1,
    roof: "gable",
    wing: "none",
    rooftop: "none",
    pitch: "low",
    depth: "short",
    roofMaterial: "shingle",
    wall: "clapboard",
    door: "centre",
    doorStyle: "plain",
    windows: 2,
    windowStyle: "plain",
    porch: "steps",
    chimney: "none",
    props: "none",
    roofColor: "natural",
    wallColor: "natural",
    trimColor: "brown",
    doorColor: "blue"
};

const oneOf = <T,>(list: readonly T[], value: unknown, fallback: T): T => (list.includes(value as T) ? (value as T) : fallback);

function colour<F extends MaterialColor>(value: unknown, fallback: F, allowNatural = false): BuildingColor | F {
    if (typeof value !== "string") return fallback;
    if (allowNatural && value === "natural") return "natural" as F;
    return Object.prototype.hasOwnProperty.call(colorRamps, value) ? (value as ColorName) : parseHex(value) ?? fallback;
}

/** Replaces anything that is not in the fixed lists with its default, and a colour that is not a common colour or a valid hex colour with the default colour. */
export function resolveBuildingConfig(config: BuildingConfig = {}): ResolvedBuildingConfig {
    const d = defaultBuildingConfig;
    const c = config as Record<string, unknown>;
    return {
        width: oneOf(buildingWidths, c.width, d.width),
        storeys: oneOf(buildingStoreys, c.storeys, d.storeys),
        wingStoreys: oneOf(buildingStoreys, c.wingStoreys, d.wingStoreys),
        roof: oneOf(roofShapes, c.roof, d.roof),
        wing: oneOf(buildingWings, c.wing, d.wing),
        rooftop: oneOf(buildingRooftops, c.rooftop, d.rooftop),
        pitch: oneOf(roofPitches, c.pitch, d.pitch),
        depth: oneOf(buildingDepths, c.depth, d.depth),
        roofMaterial: oneOf(roofMaterials, c.roofMaterial, d.roofMaterial),
        wall: oneOf(buildingWalls, c.wall, d.wall),
        door: oneOf(doorPositions, c.door, d.door),
        doorStyle: oneOf(doorStyles, c.doorStyle, d.doorStyle),
        windows: typeof c.windows === "number" && Number.isFinite(c.windows) ? Math.min(MAX_WINDOWS, Math.max(0, Math.round(c.windows))) : d.windows,
        windowStyle: oneOf(windowStyles, c.windowStyle, d.windowStyle),
        porch: oneOf(porches, c.porch, d.porch),
        chimney: oneOf(chimneys, c.chimney, d.chimney),
        props: oneOf(buildingProps, c.props, d.props),
        roofColor: colour(c.roofColor, d.roofColor, true),
        wallColor: colour(c.wallColor, d.wallColor, true),
        trimColor: colour(c.trimColor, d.trimColor),
        doorColor: colour(c.doorColor, d.doorColor)
    };
}

/** A stable string for a config, for caching. */
export function buildingKey(config: BuildingConfig = {}): string {
    return Object.values(resolveBuildingConfig(config)).join("|");
}

/** A random building, the same for the same `seed`. Every choice comes from the fixed lists. */
export function randomBuilding(seed: number = Math.floor(Math.random() * 4294967296)): ResolvedBuildingConfig {
    let a = seed >>> 0;
    const next = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pick = <T,>(options: readonly T[]): T => options[Math.floor(next() * options.length)];
    const colours = buildingColors.filter((c) => c !== "white" && c !== "grey");
    return {
        width: pick(buildingWidths),
        storeys: pick(buildingStoreys),
        wingStoreys: pick(buildingStoreys),
        roof: pick(roofShapes),
        wing: pick(buildingWings),
        rooftop: pick(buildingRooftops),
        pitch: pick(roofPitches),
        depth: pick(buildingDepths),
        roofMaterial: pick(roofMaterials),
        wall: pick(buildingWalls),
        door: pick(doorPositions),
        doorStyle: pick(doorStyles),
        windows: Math.floor(next() * (MAX_WINDOWS + 1)),
        windowStyle: pick(windowStyles),
        porch: pick(porches),
        chimney: pick(chimneys),
        props: pick(buildingProps),
        roofColor: pick<MaterialColor>(["natural", "natural", ...colours]),
        wallColor: pick<MaterialColor>(["natural", "natural", "white", "yellow", "pink", "grey", "teal", "blue"]),
        trimColor: pick(["white", "brown", "grey"] as const),
        doorColor: pick(colours)
    };
}
