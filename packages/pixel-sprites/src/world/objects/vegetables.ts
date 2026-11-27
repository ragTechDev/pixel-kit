import { getMaskWidth, type PixelMask } from "../../core/maskUtils";
import { fruitRoundMask } from "../masks/objects/fruit/round.mask";
import { vegetableBushMask } from "../masks/objects/vegetable/bush.mask";
import { vegetableCabbageMask } from "../masks/objects/vegetable/cabbage.mask";
import { vegetableCabbageVeinsMask } from "../masks/objects/vegetable/cabbageVeins.mask";
import { vegetableCarrotMask } from "../masks/objects/vegetable/carrot.mask";
import { vegetableCobMask } from "../masks/objects/vegetable/cob.mask";
import { vegetablePumpkinMask } from "../masks/objects/vegetable/pumpkin.mask";
import { vegetablePumpkinRibsMask } from "../masks/objects/vegetable/pumpkinRibs.mask";
import { vegetableRadishMask } from "../masks/objects/vegetable/radish.mask";
import { vegetableStalkMask } from "../masks/objects/vegetable/stalk.mask";
import { vegetableStemMask } from "../masks/objects/vegetable/stem.mask";
import { vegetableTomatoMask } from "../masks/objects/vegetable/tomato.mask";
import { vegetableTurnipMask } from "../masks/objects/vegetable/turnip.mask";
import { vegetableTuftMask } from "../masks/objects/vegetable/tuft.mask";
import type { CropId, VegId, Vegetable } from "../types";
import type { ObjectPart } from "./objectParts";
import type { ObjectRampId } from "./ramps";

// Farming art. The soil stages are tiles (untilled, tilled, seeded, sprouting), and a grown vegetable is an object stood on tilled soil, so
// there is no tile for every vegetable and the soil is not drawn again for each. A vegetable has two pictures that share one mask:
//
// - `veg_<name>`: the vegetable picked, a 16x16 ground object to drop, carry or sell.
// - `crop_<name>`: the vegetable in the field. A root vegetable (carrot, radish, turnip, beet) is a tuft of leaves over the top of its own
//   mask, cut to its first few rows, so it looks buried in the soil below it. The others (cabbage, pumpkin, tomato, corn) grow above the
//   ground, so they are drawn whole: a head, a vine, a bush, a stalk.

/** The vegetables a game can grow, in the order a library lists them. */
export const vegetables = ["carrot", "radish", "turnip", "beet", "cabbage", "pumpkin", "tomato", "corn"] as const satisfies readonly Vegetable[];

/** The ones that grow in the ground, and show only their top until they are picked. */
export const rootVegetables = ["carrot", "radish", "turnip", "beet"] as const satisfies readonly Vegetable[];

export const cropIds: readonly CropId[] = vegetables.map((v) => `crop_${v}` as const);
export const vegIds: readonly VegId[] = vegetables.map((v) => `veg_${v}` as const);

/** A mask centred across the 16-pixel tile, `y` pixels down. */
const centred = (mask: PixelMask, ramp: ObjectRampId, y: number, extra: Partial<ObjectPart> = {}): ObjectPart => ({ mask, ramp, x: Math.floor((16 - getMaskWidth(mask)) / 2), y, ...extra });

interface Look {
    /** What the vegetable looks like picked. */
    readonly item: readonly ObjectPart[];
    /** What it looks like in the field. */
    readonly field: readonly ObjectPart[];
}

/** A root vegetable: picked, with leaves on top of it, and in the field, only the leaves and the top of it. */
function root(body: PixelMask, ramp: ObjectRampId, crown: { from: number; rows: number }): Look {
    return {
        item: [{ mask: vegetableTuftMask, ramp: "leaf", x: 4, y: 1 }, centred(body, ramp, 6)],
        field: [{ mask: vegetableTuftMask, ramp: "leaf", x: 4, y: 5 }, centred(body.slice(crown.from, crown.from + crown.rows), ramp, 10)]
    };
}

const looks: Record<Vegetable, Look> = {
    carrot: root(vegetableCarrotMask, "veg_carrot", { from: 0, rows: 3 }),
    radish: root(vegetableRadishMask, "veg_radish", { from: 0, rows: 3 }),
    turnip: root(vegetableTurnipMask, "veg_turnip", { from: 0, rows: 3 }),
    beet: root(fruitRoundMask, "veg_beet", { from: 1, rows: 3 }),
    cabbage: {
        item: [centred(vegetableCabbageMask, "veg_cabbage", 3), centred(vegetableCabbageVeinsMask, "veg_cabbage", 3, { tone: "shadow" })],
        field: [centred(vegetableCabbageMask, "veg_cabbage", 3), centred(vegetableCabbageVeinsMask, "veg_cabbage", 3, { tone: "shadow" })]
    },
    pumpkin: {
        item: [centred(vegetablePumpkinMask, "veg_pumpkin", 4), centred(vegetablePumpkinRibsMask, "veg_pumpkin", 4, { tone: "shadow" }), centred(vegetableStemMask, "leaf", 2)],
        field: [centred(vegetablePumpkinMask, "veg_pumpkin", 4), centred(vegetablePumpkinRibsMask, "veg_pumpkin", 4, { tone: "shadow" }), centred(vegetableStemMask, "leaf", 2)]
    },
    tomato: {
        item: [centred(fruitRoundMask, "fruit_red", 4), centred(vegetableStemMask, "leaf", 3)],
        field: [
            { mask: vegetableBushMask, ramp: "leaf", x: 1, y: 3 },
            { mask: vegetableTomatoMask, ramp: "fruit_red", x: 3, y: 7 },
            { mask: vegetableTomatoMask, ramp: "fruit_red", x: 10, y: 8 }
        ]
    },
    corn: {
        item: [centred(vegetableCobMask, "veg_corn", 3), { mask: vegetableStemMask, ramp: "leaf", x: 7, y: 11 }],
        field: [
            { mask: vegetableStalkMask, ramp: "leaf", x: 2, y: 3 },
            { mask: vegetableCobMask, ramp: "veg_corn", x: 3, y: 12 },
            { mask: vegetableCobMask, ramp: "veg_corn", x: 9, y: 17 }
        ]
    }
};

const record = <Id extends string>(ids: readonly Id[], prefix: string, pick: (look: Look) => readonly ObjectPart[]) =>
    Object.fromEntries(vegetables.map((v, i) => [ids[i], pick(looks[v])])) as unknown as Record<Id, readonly ObjectPart[]>;

/** The picked vegetables: 16×16 ground objects. */
export const vegItemParts = record(vegIds, "veg_", (look) => look.item);

/** The vegetables in a field. Corn is two tiles tall (16×32) and the rest one (16×16). */
export const cropParts = record(cropIds, "crop_", (look) => look.field);
