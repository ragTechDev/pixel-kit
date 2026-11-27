import type { Ramp } from "../../core/sprite";
import { objectRamps } from "../objects/ramps";
import { TILE_SIZE } from "../size";
import { resolveBuildingConfig, type BuildingConfig, type ResolvedBuildingConfig } from "./config";
import { rampOf, shape, type Shape } from "./shapes";

/** The ramps a building is drawn in: its own colours, and the fixed ones for materials. */
export type Role = "roof" | "wall" | "trim" | "door" | "wood" | "glass" | "gold" | "stone" | "brick" | "flower" | "leaf";

const stone: Ramp = { outline: "#4A4C50", base: "#A9ADB4", shadow: "#868A92", highlight: "#CBCED3" };

/** The size of a building in tiles: its width, its height and how many of those rows are roof. */
export function buildingBox(config?: BuildingConfig): { width: number; height: number; roofTiles: number } {
    const c = resolveBuildingConfig(config);
    const roofTiles = c.pitch === "steep" ? 3 : 2;
    return { width: c.width, height: roofTiles + c.storeys * 2, roofTiles };
}

/** The measurements one building is drawn to, shared by its roof, wall and facade. */
export interface Frame {
    readonly c: ResolvedBuildingConfig;
    /** Width and height of the whole picture in pixels. */
    readonly W: number;
    readonly H: number;
    /** Width in tiles, and how many rows of tiles are roof. */
    readonly tiles: number;
    readonly roofTiles: number;
    /** Where the wall starts, and the lower edge of the roof, which overhangs the wall. */
    readonly yw: number;
    readonly yb: number;
    /** The wall's left and right edges. */
    readonly wx0: number;
    readonly wx1: number;
    /** The last row of the building, the line it stands on. */
    readonly ground: number;
    readonly ramps: Readonly<Record<Role, Ramp>>;
    /** An empty shape the size of the picture. */
    readonly here: () => Shape;
}

export function makeFrame(c: ResolvedBuildingConfig): Frame {
    const box = buildingBox(c);
    const W = box.width * TILE_SIZE;
    const H = box.height * TILE_SIZE;
    const yw = box.roofTiles * TILE_SIZE;
    return {
        c,
        W,
        H,
        tiles: box.width,
        roofTiles: box.roofTiles,
        yw,
        yb: yw + 4,
        wx0: 4,
        wx1: W - 4,
        ground: H - 1,
        ramps: {
            roof: rampOf(c.roofColor),
            wall: rampOf(c.wallColor),
            trim: rampOf(c.trimColor),
            door: rampOf(c.doorColor),
            wood: objectRamps.wood,
            glass: objectRamps.glass,
            gold: objectRamps.gold,
            stone,
            brick: objectRamps.flower_rust,
            flower: objectRamps.flower_red,
            leaf: objectRamps.leaf
        },
        here: () => shape(W, H)
    };
}
