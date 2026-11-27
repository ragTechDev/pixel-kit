import type { Ramp } from "../../core/sprite";
import { objectRamps } from "../objects/ramps";
import { TILE_SIZE } from "../size";
import { buildingDepths, type BuildingWall, type MaterialColor, type RoofMaterial, type VolumeConfig } from "./config";
import { rampOf, shape, type Shape } from "./shapes";

/** The ramps a building is drawn in: its own colours, and the fixed ones for materials. */
export type Role = "roof" | "wall" | "trim" | "door" | "wood" | "glass" | "gold" | "stone" | "brick" | "flower" | "leaf" | "metal" | "solar" | "cardboard" | "soil" | "pink";

const stone: Ramp = { outline: "#4A4C50", base: "#A9ADB4", shadow: "#868A92", highlight: "#CBCED3" };
const metal: Ramp = { outline: "#3C4046", base: "#C3C8CE", shadow: "#8E949C", highlight: "#E8EBEE" };
const soil: Ramp = { outline: "#2B1A10", base: "#47301F", shadow: "#36251A", highlight: "#5C4029" };
const solar: Ramp = { outline: "#142038", base: "#2E4A7C", shadow: "#213A63", highlight: "#5B7FB8" };

/** The colour of each roof material as it comes: slate, terracotta, straw and weathered wood. */
export const naturalRoofs: Record<RoofMaterial, Ramp> = {
    shingle: { outline: "#2E3238", base: "#5F6670", shadow: "#474D55", highlight: "#7C848E" },
    ceramic: { outline: "#4A2318", base: "#C8622F", shadow: "#9A4824", highlight: "#DE8554" },
    thatch: { outline: "#4A3A1C", base: "#C9A85C", shadow: "#A08440", highlight: "#E0C985" },
    wood: { outline: "#3A2616", base: "#8A6240", shadow: "#664630", highlight: "#A98462" }
};

/** The colour of each wall material as it comes: painted-wood tan, brick red, grey stone and cream plaster. */
export const naturalWalls: Record<BuildingWall, Ramp> = {
    clapboard: { outline: "#3E2A1C", base: "#C4A072", shadow: "#9C7C54", highlight: "#D8BC94" },
    brick: { outline: "#3B1D17", base: "#A64B3A", shadow: "#7E3A2E", highlight: "#BC6A57" },
    stone,
    timber: { outline: "#5A5348", base: "#EDE3CC", shadow: "#C4BAA2", highlight: "#F5EEDD" }
};

/** A flat roof has no covering: its parapet and floor are concrete. */
const flatRoof: Ramp = { outline: "#383A3D", base: "#8C9099", shadow: "#65686E", highlight: "#AFB1B8" };

const painted = (color: MaterialColor, natural: Ramp): Ramp => (color === "natural" ? natural : rampOf(color));

/**
 * The size in tiles of one volume of a building (a building is one volume, or two with a wing): its width, its height and
 * how many of those rows are roof. The ground floor is three tiles tall and any upper storey two, so a door, with its step,
 * and the windows all fit under the eave of the roof.
 */
export function volumeBox(c: VolumeConfig): { width: number; height: number; roofTiles: number } {
    // The roof is seen at a shallow angle: how far it goes up the picture is how deep it is, so it takes only a couple of tiles.
    // A steep roof is a tile taller, and each step of depth adds a tile of roof, further up the picture. A mansard is a steep
    // slope under a flat top, and a flat roof is a floor inside a thick parapet, so each needs a tile more.
    const roofTiles = (c.pitch === "steep" ? 3 : 2) + (c.roof === "mansard" || c.roof === "flat" ? 1 : 0) + buildingDepths.indexOf(c.depth);
    return { width: c.width, height: roofTiles + 1 + c.storeys * 2, roofTiles };
}

/** The measurements one building is drawn to, shared by its roof, wall and facade. */
export interface Frame {
    readonly c: VolumeConfig;
    /** Width and height of the whole picture in pixels. */
    readonly W: number;
    readonly H: number;
    /** Width in tiles, and how many rows of tiles are roof. */
    readonly tiles: number;
    readonly roofTiles: number;
    /** Where the wall starts, and the lower edge of the roof, which overhangs the wall. */
    readonly yw: number;
    readonly yb: number;
    /** The left and right edges of the roof, and the middle between them. */
    readonly rl: number;
    readonly rr: number;
    readonly mid: number;
    /** The wall's left and right edges. */
    readonly wx0: number;
    readonly wx1: number;
    /** The last row of the building, the line it stands on. */
    readonly ground: number;
    readonly ramps: Readonly<Record<Role, Ramp>>;
    /** Where the volume's left edge is in the whole picture, in pixels, so a pattern on the wall carries on across a join. */
    readonly xOffset: number;
    /** An empty shape the size of the picture. */
    readonly here: () => Shape;
}

export function makeFrame(c: VolumeConfig, xOffset = 0): Frame {
    const box = volumeBox(c);
    const W = box.width * TILE_SIZE;
    const H = box.height * TILE_SIZE;
    const yw = box.roofTiles * TILE_SIZE;
    // The roof is set in a pixel from the edge of the picture, but where it joins the volume beside it, it goes a pixel further, over the line down the corner.
    const rl = c.joined?.left ? 0 : 1;
    const rr = c.joined?.right ? W : W - 1;
    return {
        c,
        W,
        H,
        tiles: box.width,
        roofTiles: box.roofTiles,
        yw,
        yb: yw + 4,
        rl,
        rr,
        mid: (rl + rr) / 2,
        // The wall is set in from the edge by the roof's overhang, except where it joins the volume beside it.
        wx0: c.joined?.left ? 0 : 4,
        wx1: W - (c.joined?.right ? 0 : 4),
        ground: H - 1,
        ramps: {
            roof: painted(c.roofColor, c.roof === "flat" ? flatRoof : naturalRoofs[c.roofMaterial]),
            wall: painted(c.wallColor, naturalWalls[c.wall]),
            trim: rampOf(c.trimColor),
            door: rampOf(c.doorColor),
            wood: objectRamps.wood,
            glass: objectRamps.glass,
            gold: objectRamps.gold,
            stone,
            brick: objectRamps.flower_rust,
            flower: objectRamps.flower_red,
            leaf: objectRamps.leaf,
            metal,
            solar,
            cardboard: objectRamps.wood_light,
            soil,
            pink: objectRamps.flower_pink
        },
        xOffset,
        here: () => shape(W, H)
    };
}
