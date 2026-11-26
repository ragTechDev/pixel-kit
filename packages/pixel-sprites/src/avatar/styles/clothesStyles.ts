import type { PixelMask } from "../../core/maskUtils";
import { headOrientations, maskForView, type HeadOrientation, type ViewMasks } from "../orientation";
import { legFrames, liftFoot, onLegs, sleeveFrames as sleevesOver, smallerFoot, type LegPose } from "../legPoses";
import { armsFrames } from "../arms";
import { skirtFrontMask } from "../masks/clothes/bottom/skirtFront.mask";
import { skirtSideMask } from "../masks/clothes/bottom/skirtSide.mask";
import { shortsFrontMask } from "../masks/clothes/bottom/shortsFront.mask";
import { shortsSideMask } from "../masks/clothes/bottom/shortsSide.mask";
import { dressTorsoFrontMask } from "../masks/clothes/full/dressTorsoFront.mask";
import { dressTorsoSideMask } from "../masks/clothes/full/dressTorsoSide.mask";
import { overallsTorsoFrontMask } from "../masks/clothes/full/overallsTorsoFront.mask";
import { overallsTorsoSideMask } from "../masks/clothes/full/overallsTorsoSide.mask";
import { bootsFrontMask } from "../masks/clothes/shoes/bootsFront.mask";
import { bootsSideMask } from "../masks/clothes/shoes/bootsSide.mask";
import { armsSideBackMask } from "../masks/armsSideBack.mask";
import { armsSideForwardMask } from "../masks/armsSideForward.mask";
import { bootsSideContactMask } from "../masks/clothes/shoes/bootsSideContact.mask";
import { sandalsFrontMask } from "../masks/clothes/shoes/sandalsFront.mask";
import { sandalsSideMask } from "../masks/clothes/shoes/sandalsSide.mask";
import { sandalsSideContactMask } from "../masks/clothes/shoes/sandalsSideContact.mask";
import { shoesFrontMask } from "../masks/clothes/shoes/shoesFront.mask";
import { shoesSideMask } from "../masks/clothes/shoes/shoesSide.mask";
import { shoesSideContactMask } from "../masks/clothes/shoes/shoesSideContact.mask";
import { longSleevesFrontMask } from "../masks/clothes/top/longSleevesFront.mask";
import { longSleevesSideMask } from "../masks/clothes/top/longSleevesSide.mask";
import { longSleeveTorsoFrontMask } from "../masks/clothes/top/longSleeveTorsoFront.mask";
import { longSleeveTorsoSideMask } from "../masks/clothes/top/longSleeveTorsoSide.mask";
import { shirtSleevesFrontMask } from "../masks/clothes/top/shirtSleevesFront.mask";
import { shirtSleevesSideMask } from "../masks/clothes/top/shirtSleevesSide.mask";
import { shirtTorsoFrontMask } from "../masks/clothes/top/shirtTorsoFront.mask";
import { shirtTorsoSideMask } from "../masks/clothes/top/shirtTorsoSide.mask";
import { spaghettiTopTorsoFrontMask } from "../masks/clothes/top/spaghettiTopTorsoFront.mask";
import { spaghettiTopTorsoSideMask } from "../masks/clothes/top/spaghettiTopTorsoSide.mask";

export type ArmPose = "down" | "forward" | "back";
export type { LegPose };
/** `overArms` goes over the arms but under the hair and head, so a chin or a lock of hair stays on top of a sleeve. */
export type GarmentPlacement = "behindBody" | "overBody" | "overArms" | "overlay";
export type GarmentSlot = "top" | "bottom" | "shoes";

export type GarmentLayer = {
    mask: PixelMask;
    offsetX: number;
    offsetY: number;
    placement: GarmentPlacement;
    armPoses?: readonly ArmPose[];
    /** The mask in each leg pose, for a garment that moves with the legs. Without it the garment stays as it is. */
    poses?: Record<LegPose, PixelMask>;
};

export type GarmentDefinition = {
    slot: GarmentSlot;
    /** A one-piece top (a dress, overalls) that also covers the legs, so no bottom is drawn under it. */
    coversBottom?: true;
    byOrientation: Partial<Record<HeadOrientation, readonly GarmentLayer[]>>;
    fallback: readonly GarmentLayer[];
};

type ViewedLayer = Omit<GarmentLayer, "mask" | "poses"> & { masks: ViewMasks; poses?: Record<LegPose, ViewMasks> };

/** Builds a garment that is drawn from the front, either side and the back, each from its own mask. */
function viewed(slot: GarmentSlot, layers: readonly ViewedLayer[], extra: { coversBottom?: true } = {}): GarmentDefinition {
    const forView = (o: HeadOrientation): GarmentLayer[] =>
        layers.map(({ masks, poses, ...rest }) => ({
            ...rest,
            mask: maskForView(masks, o),
            ...(poses && { poses: Object.fromEntries(Object.entries(poses).map(([pose, m]) => [pose, maskForView(m, o)])) as Record<LegPose, PixelMask> })
        }));
    const byOrientation = Object.fromEntries(Object.keys(headOrientations).map((o) => [o, forView(o as HeadOrientation)]));
    return { slot, ...extra, byOrientation, fallback: forView("front") };
}

/** Sleeves swing with the arms: in profile they are the top rows of the swung arm. */
const sleeveFrames = (front: PixelMask, side: PixelMask) =>
    sleevesOver(front, side, armsFrames, { forward: armsSideForwardMask.slice(0, side.length), back: armsSideBackMask.slice(0, side.length) });

export type TopStyle = "none" | "spaghetti" | "shirt" | "longSleeve" | "overalls" | "dress";
export type BottomStyle = "none" | "shorts" | "skirt";
export type ShoeStyle = "none" | "boots" | "sandals" | "shoes";

export const topStyles = {
    none: { slot: "top", byOrientation: {}, fallback: [] },
    spaghetti: viewed("top", [{ masks: { front: spaghettiTopTorsoFrontMask, side: spaghettiTopTorsoSideMask }, offsetX: 2, offsetY: 6, placement: "overBody" }]),
    shirt: viewed("top", [
        { masks: { front: shirtTorsoFrontMask, side: shirtTorsoSideMask }, offsetX: 2, offsetY: 6, placement: "overBody" },
        { masks: { front: shirtSleevesFrontMask, side: shirtSleevesSideMask }, poses: sleeveFrames(shirtSleevesFrontMask, shirtSleevesSideMask), offsetX: 0, offsetY: 6, placement: "overArms", armPoses: ["down"] }
    ]),
    longSleeve: viewed("top", [
        { masks: { front: longSleeveTorsoFrontMask, side: longSleeveTorsoSideMask }, offsetX: 2, offsetY: 6, placement: "overBody" },
        { masks: { front: longSleevesFrontMask, side: longSleevesSideMask }, poses: sleeveFrames(longSleevesFrontMask, longSleevesSideMask), offsetX: 0, offsetY: 6, placement: "overArms", armPoses: ["down"] }
    ]),
    overalls: viewed("top", [{ masks: { front: overallsTorsoFrontMask, side: overallsTorsoSideMask }, offsetX: 2, offsetY: 6, placement: "overBody" }], { coversBottom: true }),
    dress: viewed("top", [{ masks: { front: dressTorsoFrontMask, side: dressTorsoSideMask }, offsetX: 2, offsetY: 6, placement: "overBody" }], { coversBottom: true })
} as const satisfies Record<TopStyle, GarmentDefinition>;

export const bottomStyles = {
    none: { slot: "bottom", byOrientation: {}, fallback: [] },
    shorts: viewed("bottom", [{ masks: { front: shortsFrontMask, side: shortsSideMask }, offsetX: 2, offsetY: 12, placement: "overBody" }]),
    skirt: viewed("bottom", [{ masks: { front: skirtFrontMask, side: skirtSideMask }, offsetX: 2, offsetY: 12, placement: "overBody" }])
} as const satisfies Record<BottomStyle, GarmentDefinition>;

/**
 * Footwear follows the legs. At the front the raised foot is the neutral footwear moved up two rows and made smaller, as the leg is, the
 * right-foot frame is its flip, and the side contact is drawn.
 */
function footwear(front: PixelMask, side: PixelMask, contact: PixelMask): GarmentDefinition {
    const neutral = { front: onLegs(front), side: onLegs(side) };
    const poses = legFrames(neutral, { front: smallerFoot(liftFoot(neutral.front, "left", 2), "left"), side: onLegs(contact) });
    return viewed("shoes", [{ masks: neutral, offsetX: 2, offsetY: 13, placement: "overlay", poses }]);
}

export const shoeStyles = {
    none: { slot: "shoes", byOrientation: {}, fallback: [] },
    boots: footwear(bootsFrontMask, bootsSideMask, bootsSideContactMask),
    sandals: footwear(sandalsFrontMask, sandalsSideMask, sandalsSideContactMask),
    shoes: footwear(shoesFrontMask, shoesSideMask, shoesSideContactMask)
} as const satisfies Record<ShoeStyle, GarmentDefinition>;
