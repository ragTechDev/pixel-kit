import { mirrorMask, type PixelMask } from "../../core/maskUtils";
import { headOrientations, maskForView, type HeadOrientation, type ViewMasks } from "../orientation";
import { legFrames, liftFoot, onLegs, sleeveFrames as sleevesOver, smallerFoot, type LegPose } from "../legPoses";
import { armsFrames } from "../arms";
import { legsFrames } from "../legs";
import { skirtFlowingFrontMask } from "../masks/clothes/bottom/skirtFlowingFront.mask";
import { skirtFlowingSideMask } from "../masks/clothes/bottom/skirtFlowingSide.mask";
import { skirtPencilFrontMask } from "../masks/clothes/bottom/skirtPencilFront.mask";
import { skirtPencilSideMask } from "../masks/clothes/bottom/skirtPencilSide.mask";
import { skirtPleatedFrontMask } from "../masks/clothes/bottom/skirtPleatedFront.mask";
import { skirtPleatedSideMask } from "../masks/clothes/bottom/skirtPleatedSide.mask";
import { skirtFrontMask } from "../masks/clothes/bottom/skirtFront.mask";
import { skirtSideMask } from "../masks/clothes/bottom/skirtSide.mask";
import { shortsFrontMask } from "../masks/clothes/bottom/shortsFront.mask";
import { shortsSideMask } from "../masks/clothes/bottom/shortsSide.mask";
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
import { roundCollarFrontMask, roundCollarSideMask } from "../masks/clothes/top/collar/round.mask";
import { scoopCollarFrontMask, scoopCollarSideMask } from "../masks/clothes/top/collar/scoop.mask";
import { squareCollarFrontMask, squareCollarSideMask } from "../masks/clothes/top/collar/square.mask";
import { vCollarFrontMask, vCollarSideMask } from "../masks/clothes/top/collar/v.mask";
import { plungeCollarFrontMask, plungeCollarSideMask } from "../masks/clothes/top/collar/plunge.mask";
import { boatCollarFrontMask, boatCollarSideMask } from "../masks/clothes/top/collar/boat.mask";
import { sweetheartCollarFrontMask, sweetheartCollarSideMask } from "../masks/clothes/top/collar/sweetheart.mask";
import { keyholeCollarFrontMask, keyholeCollarSideMask } from "../masks/clothes/top/collar/keyhole.mask";
import { shirtCollarFrontMask, shirtCollarSideMask } from "../masks/clothes/top/collar/shirt.mask";
import { poloCollarFrontMask, poloCollarSideMask } from "../masks/clothes/top/collar/polo.mask";
import { henleyCollarFrontMask, henleyCollarSideMask } from "../masks/clothes/top/collar/henley.mask";
import { turtleneckCollarFrontMask, turtleneckCollarSideMask } from "../masks/clothes/top/collar/turtleneck.mask";
import { mockCollarFrontMask, mockCollarSideMask } from "../masks/clothes/top/collar/mock.mask";
import { cowlCollarFrontMask, cowlCollarSideMask } from "../masks/clothes/top/collar/cowl.mask";
import { halterCollarFrontMask, halterCollarSideMask } from "../masks/clothes/top/collar/halter.mask";
import { offShoulderCollarFrontMask, offShoulderCollarSideMask } from "../masks/clothes/top/collar/offShoulder.mask";
import { oneShoulderCollarFrontMask, oneShoulderCollarSideMask } from "../masks/clothes/top/collar/oneShoulder.mask";
import { strapsCollarFrontMask, strapsCollarSideMask } from "../masks/clothes/top/collar/straps.mask";
import { straplessCollarFrontMask, straplessCollarSideMask } from "../masks/clothes/top/collar/strapless.mask";
import { longSleevesFrontMask } from "../masks/clothes/top/longSleevesFront.mask";
import { longSleevesSideMask } from "../masks/clothes/top/longSleevesSide.mask";
import { shirtSleevesFrontMask } from "../masks/clothes/top/shirtSleevesFront.mask";
import { shirtSleevesSideMask } from "../masks/clothes/top/shirtSleevesSide.mask";

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
    /** A garment that sways when walking, like hair: its rows below the pivot row shift sideways, further the lower they are. `reach` is how far the hem moves. */
    swing?: { pivot: number; reach?: number };
};

export type GarmentDefinition = {
    slot: GarmentSlot;
    /** A long bottom that hangs over the tops of the shoes, so the shoes are drawn under it. */
    hangsOverShoes?: true;
    /** A floor-length bottom that stops just above the feet: only the last row of the legs and shoes shows under it. */
    showsOnlyFeet?: true;
    /** A floor-length bottom that covers the legs and feet, so neither is drawn. */
    coversFeet?: true;
    byOrientation: Partial<Record<HeadOrientation, readonly GarmentLayer[]>>;
    fallback: readonly GarmentLayer[];
};

type ViewedLayer = Omit<GarmentLayer, "mask" | "poses"> & { masks: ViewMasks; poses?: Record<LegPose, ViewMasks> };

/** Builds a garment that is drawn from the front, either side and the back, each from its own mask. */
function viewed(slot: GarmentSlot, layers: readonly ViewedLayer[], extra: { hangsOverShoes?: true; showsOnlyFeet?: true; coversFeet?: true } = {}): GarmentDefinition {
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

export type TopStyle = "none" | "top";
export type BottomStyle = "none" | "skirt" | "pants";
export type ShoeStyle = "none" | "boots" | "sandals" | "shoes";

/**
 * How far down a top goes, in rows from the shoulder. Regular is where a shirt ends. A hip-length top reaches the row where a
 * bottom begins, and a tunic hangs past it, widening over the hips: those are the tops that can go over the bottom.
 */
export const topLengths = { crop: 1, short: 1, regular: 1, long: 1, hip: 1, tunic: 1 } as const;
export type TopLength = keyof typeof topLengths;
const TOP_ROWS: Record<TopLength, number> = { crop: 3, short: 4, regular: 5, long: 6, hip: 7, tunic: 9 };
/** Whether a top is long enough to meet the bottom, so that it matters which of the two is over the other. */
export const topMeetsBottom = (length: TopLength): boolean => TOP_ROWS[length] >= 7;

/**
 * How a top and a bottom go together. A top that meets the bottom goes over it, hanging free (`untucked`, the default), or
 * the bottom goes over the top, which is `tucked` in. As a `onePiece` the two are a single garment, with no seam between them.
 */
export const tucks = { tucked: 1, untucked: 1, onePiece: 1 } as const;
export type Tuck = keyof typeof tucks;

/** How far down the arm a top's sleeves go, in rows: a cap sleeve is two, a short sleeve three and a long sleeve four. */
export const sleeveLengths = { none: 1, cap: 1, short: 1, long: 1 } as const;
export type SleeveLength = keyof typeof sleeveLengths;
const SLEEVES: Record<Exclude<SleeveLength, "none">, ViewMasks> = {
    cap: { front: shirtSleevesFrontMask.slice(0, 2), side: shirtSleevesSideMask.slice(0, 2) },
    short: { front: shirtSleevesFrontMask, side: shirtSleevesSideMask },
    long: { front: longSleevesFrontMask, side: longSleevesSideMask }
};

type CollarDefinition = {
    /** The collar rows, the first three or four rows of a top, from the front and in profile. */
    front: PixelMask;
    side: PixelMask;
    /** From behind: the front's rows, the front's flipped, or a plain round neck, which most necklines are at the back. */
    back: "same" | "mirror" | "round";
    /** Whether the collar has sleeves. Straps, a strapless top and a halter neck leave the arms bare. */
    sleeves: boolean;
};
/**
 * The cut-out of a neckline is marked "N", an opening with no outline of its own, so that bare skin shows there instead of a
 * dark edge: any gap between the cloth in a row of the collar. Straps keep their outlines, as the spaghetti top always had.
 */
const openNeck = (rows: PixelMask): PixelMask =>
    rows.map((row) => {
        const first = row.search(/[^0]/);
        const last = row.length - 1 - [...row].reverse().findIndex((c) => c !== "0");
        return first < 0 ? row : row.slice(0, first) + row.slice(first, last + 1).replace(/0/g, "N") + row.slice(last + 1);
    });
const collar = (front: PixelMask, side: PixelMask, back: CollarDefinition["back"], sleeves = true, open = true): CollarDefinition => ({
    front: open ? openNeck(front) : front,
    side: open ? openNeck(side) : side,
    back,
    sleeves
});
const COLLARS = {
    round: collar(roundCollarFrontMask, roundCollarSideMask, "same"),
    scoop: collar(scoopCollarFrontMask, scoopCollarSideMask, "round"),
    square: collar(squareCollarFrontMask, squareCollarSideMask, "round"),
    v: collar(vCollarFrontMask, vCollarSideMask, "round"),
    plunge: collar(plungeCollarFrontMask, plungeCollarSideMask, "round"),
    boat: collar(boatCollarFrontMask, boatCollarSideMask, "round"),
    sweetheart: collar(sweetheartCollarFrontMask, sweetheartCollarSideMask, "round"),
    keyhole: collar(keyholeCollarFrontMask, keyholeCollarSideMask, "round"),
    shirt: collar(shirtCollarFrontMask, shirtCollarSideMask, "same"),
    polo: collar(poloCollarFrontMask, poloCollarSideMask, "same"),
    henley: collar(henleyCollarFrontMask, henleyCollarSideMask, "round"),
    turtleneck: collar(turtleneckCollarFrontMask, turtleneckCollarSideMask, "same"),
    mock: collar(mockCollarFrontMask, mockCollarSideMask, "same"),
    cowl: collar(cowlCollarFrontMask, cowlCollarSideMask, "same"),
    halter: collar(halterCollarFrontMask, halterCollarSideMask, "same", false),
    offShoulder: collar(offShoulderCollarFrontMask, offShoulderCollarSideMask, "same"),
    oneShoulder: collar(oneShoulderCollarFrontMask, oneShoulderCollarSideMask, "mirror"),
    straps: collar(strapsCollarFrontMask, strapsCollarSideMask, "same", false, false),
    strapless: collar(straplessCollarFrontMask, straplessCollarSideMask, "same", false)
} as const satisfies Record<string, CollarDefinition>;

/** The neckline of a top, from the shoulders down: how it is cut, and what hangs at the neck. */
export const collars = Object.fromEntries(Object.keys(COLLARS).map((id) => [id, 1])) as { [K in keyof typeof COLLARS]: 1 };
export type Collar = keyof typeof COLLARS;
/** Whether a collar has sleeves. A top with none of its own has bare arms, whatever `sleeveLength` says. */
export const collarHasSleeves = (id: Collar): boolean => COLLARS[id].sleeves;

/**
 * The torso of a top: its collar rows, then the same body row down to the length (a collar with more rows than the length
 * gives is as long as its collar). A top from behind has its own collar rows.
 */
function topMasks(length: TopLength, id: Collar): ViewMasks {
    const c = COLLARS[id];
    // From the row of the hips down, a top widens over them, as wide as the legs are.
    const down = (collar: PixelMask, body: string, hips: string) =>
        [...collar, ...Array.from({ length: Math.max(0, TOP_ROWS[length] - collar.length) }, (_, i) => (collar.length + i >= 6 ? hips : body))];
    const back = c.back === "same" ? c.front : c.back === "mirror" ? mirrorMask(c.front) : COLLARS.round.front;
    return { front: down(c.front, "011111110", "111111111"), side: down(c.side, "001111100", "011111110"), back: down(back, "011111110", "111111111") };
}

const sleevePoses = new Map<SleeveLength, Record<LegPose, ViewMasks>>();
const topMemo = new Map<string, GarmentDefinition>();

/** A top by its length, its sleeves and its collar. Made once, then reused. */
export function topOf(length: TopLength, sleeves: SleeveLength, id: Collar): GarmentDefinition {
    const key = `${length}|${sleeves}|${id}`;
    let top = topMemo.get(key);
    if (!top) {
        const layers: ViewedLayer[] = [{ masks: topMasks(length, id), offsetX: 2, offsetY: 6, placement: "overBody" }];
        if (sleeves !== "none" && COLLARS[id].sleeves) {
            const masks = SLEEVES[sleeves];
            if (!sleevePoses.has(sleeves)) sleevePoses.set(sleeves, sleeveFrames(masks.front, masks.side));
            layers.push({ masks, poses: sleevePoses.get(sleeves), offsetX: 0, offsetY: 6, placement: "overArms", armPoses: ["down"] });
        }
        top = viewed("top", layers);
        topMemo.set(key, top);
    }
    return top;
}

export const topStyles = {
    none: { slot: "top", byOrientation: {}, fallback: [] },
    // A plain top: regular length, short sleeves and a round neck. `topOf` has the rest.
    top: topOf("regular", "short", "round")
} as const satisfies Record<TopStyle, GarmentDefinition>;

/** The shortest pants: one row at the hips, as wide as the legs. */
const shortPants = viewed("bottom", [{ masks: { front: shortsFrontMask, side: shortsSideMask }, offsetX: 2, offsetY: 11, placement: "overBody" }]);

export const bottomStyles = {
    none: { slot: "bottom", byOrientation: {}, fallback: [] },
    skirt: viewed("bottom", [{ masks: { front: skirtFrontMask, side: skirtSideMask }, offsetX: 2, offsetY: 11, placement: "overBody" }]),
    // Pants of the shortest length are shorts; `pantsStyles` has the longer ones.
    pants: shortPants
} as const satisfies Record<BottomStyle, GarmentDefinition>;

/** What a skirt is like: flowing and pleated skirts flare from the hips, and a pencil skirt hugs the legs straight down. */
export const skirtShapes = { flowing: 1, pleated: 1, pencil: 1 } as const;
export type SkirtShape = keyof typeof skirtShapes;
/**
 * How far down a skirt or pants go, in rows from the waist: short is the one row at the hips, and a floor-length one
 * reaches the row of the feet. A skirt from short to floor is the top rows of the full-length mask of its shape, and pants
 * are the hips and the top rows of the legs. Ankle length stops just above the feet, so only their last row shows; floor
 * length hangs over the legs and the tops of the shoes, which are drawn under it.
 */
export const bottomLengths = { short: 1, knee: 1, calf: 1, ankle: 1, floor: 1 } as const;
export type BottomLength = keyof typeof bottomLengths;

const BOTTOM_ROWS: Record<Exclude<BottomLength, "short">, number> = { knee: 2, calf: 3, ankle: 4, floor: 5 };
const SKIRT_MASKS: Record<SkirtShape, ViewMasks> = {
    flowing: { front: skirtFlowingFrontMask, side: skirtFlowingSideMask },
    pleated: { front: skirtPleatedFrontMask, side: skirtPleatedSideMask },
    pencil: { front: skirtPencilFrontMask, side: skirtPencilSideMask }
};
/**
 * How far, in pixels, the hem of a skirt sways when walking, by length. A flowing skirt sways more than a pleated one,
 * which is stiffer, and a pencil skirt does not sway. Short skirts have little hem to move.
 */
const SKIRT_SWAY: Record<SkirtShape, Partial<Record<BottomLength, number>>> = {
    flowing: { knee: 1, calf: 1, ankle: 2, floor: 2 },
    pleated: { calf: 1, ankle: 1, floor: 1 },
    pencil: {}
};
/** Where a skirt or pants reach on the legs, which decides what happens to the shoes: they go under one that reaches them. */
const BOTTOM_FLAGS: Partial<Record<BottomLength, { hangsOverShoes?: true; showsOnlyFeet?: true; coversFeet?: true }>> = {
    calf: { hangsOverShoes: true },
    ankle: { showsOnlyFeet: true },
    floor: { hangsOverShoes: true }
};

function skirtOf(shape: SkirtShape, length: BottomLength): GarmentDefinition {
    if (length === "short") return bottomStyles.skirt;
    const rows = BOTTOM_ROWS[length];
    const masks = SKIRT_MASKS[shape];
    const reach = SKIRT_SWAY[shape][length];
    return viewed(
        "bottom",
        [{ masks: { front: masks.front.slice(0, rows), side: masks.side.slice(0, rows) }, offsetX: 0, offsetY: 11, placement: "overBody", ...(reach ? { swing: { pivot: 11, reach } } : {}) }],
        BOTTOM_FLAGS[length]
    );
}

/** Every skirt, by shape and length. The one-row skirt is the same whatever the shape, since one row has none. */
export const skirtStyles = Object.fromEntries(
    (Object.keys(skirtShapes) as SkirtShape[]).map((shape) => [shape, Object.fromEntries((Object.keys(bottomLengths) as BottomLength[]).map((length) => [length, skirtOf(shape, length)]))])
) as Record<SkirtShape, Record<BottomLength, GarmentDefinition>>;

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

/**
 * Pants: a row at the hips, then the legs as far down as the length says. They are made from the legs in every pose, so a
 * pant leg steps, lifts and tucks behind with the leg it covers. Short pants are one row.
 */
function pantsOf(length: BottomLength): GarmentDefinition {
    if (length === "short") return bottomStyles.pants;
    const rows = BOTTOM_ROWS[length] - 1;
    const withHips = (legs: ViewMasks): ViewMasks => ({
        front: [...shortsFrontMask, ...legs.front.slice(0, rows)],
        side: [...shortsSideMask, ...legs.side.slice(0, rows)],
        ...(legs.back ? { back: [...shortsFrontMask, ...legs.back.slice(0, rows)] } : {})
    });
    const poses = Object.fromEntries(Object.entries(legsFrames).map(([pose, legs]) => [pose, withHips(legs)])) as Record<LegPose, ViewMasks>;
    return viewed("bottom", [{ masks: poses.neutral, poses, offsetX: 2, offsetY: 11, placement: "overBody" }], BOTTOM_FLAGS[length]);
}

/** Every pair of pants, by length. */
export const pantsStyles = Object.fromEntries((Object.keys(bottomLengths) as BottomLength[]).map((length) => [length, pantsOf(length)])) as Record<BottomLength, GarmentDefinition>;

/**
 * Two masks as one, for a top and a bottom worn as a single garment. The rows between the end of the top and the start of
 * the bottom are filled with the top's last row, and where the two overlap the top's marks win. The result is one shape,
 * so it is shaded as one and has one outline around it, and none where the top meets the bottom.
 */
function joinMasks(top: PixelMask, topAt: { x: number; y: number }, bottom: PixelMask, bottomAt: { x: number; y: number }): { mask: PixelMask; x: number; y: number } {
    const x = Math.min(topAt.x, bottomAt.x);
    const y = topAt.y;
    const width = Math.max(topAt.x + top[0].length, bottomAt.x + bottom[0].length) - x;
    const height = Math.max(topAt.y + top.length, bottomAt.y + bottom.length) - y;
    const waist = top[top.length - 1].replace(/[SDN]/g, "1");
    const mask = Array.from({ length: height }, (_, r) => {
        const cells = Array<string>(width).fill("0");
        const put = (row: string | undefined, at: number) => {
            if (row) for (let i = 0; i < row.length; i += 1) if (row[i] !== "0" && cells[at - x + i] === "0") cells[at - x + i] = row[i];
        };
        put(top[r], topAt.x);
        put(bottom[y + r - bottomAt.y], bottomAt.x);
        if (y + r >= topAt.y + top.length && y + r < bottomAt.y) put(waist, topAt.x);
        return cells.join("");
    });
    return { mask, x, y };
}

const joined = new WeakMap<GarmentDefinition, WeakMap<GarmentDefinition, GarmentDefinition>>();

/**
 * A top and a bottom as one garment, such as a dress (a top and a skirt) or overalls (a top with straps and pants). The
 * torso of the top and the bottom are merged into one layer that follows the bottom: it steps with pants and sways with a
 * flowing skirt. The sleeves stay as they are. It takes whatever the bottom does to the shoes. Made once, then reused.
 */
export function onePieceOf(top: GarmentDefinition, bottom: GarmentDefinition): GarmentDefinition {
    let byBottom = joined.get(top);
    if (!byBottom) joined.set(top, (byBottom = new WeakMap()));
    let one = byBottom.get(bottom);
    if (!one) {
        const forView = (o: HeadOrientation): GarmentLayer[] => {
            const topLayers = top.byOrientation[o] ?? top.fallback;
            const bottomLayer = (bottom.byOrientation[o] ?? bottom.fallback)[0];
            const torso = topLayers.find((l) => l.placement === "overBody");
            if (!torso || !bottomLayer) return [...topLayers];
            const at = (l: GarmentLayer) => ({ x: l.offsetX, y: l.offsetY });
            const whole = joinMasks(torso.mask, at(torso), bottomLayer.mask, at(bottomLayer));
            const layer: GarmentLayer = {
                mask: whole.mask,
                offsetX: whole.x,
                offsetY: whole.y,
                placement: "overBody",
                ...(bottomLayer.poses && {
                    poses: Object.fromEntries(Object.entries(bottomLayer.poses).map(([pose, m]) => [pose, joinMasks(torso.mask, at(torso), m, at(bottomLayer)).mask])) as Record<LegPose, PixelMask>
                }),
                ...(bottomLayer.swing && { swing: bottomLayer.swing })
            };
            return [layer, ...topLayers.filter((l) => l !== torso)];
        };
        const { hangsOverShoes, showsOnlyFeet, coversFeet } = bottom;
        one = {
            slot: "top",
            ...(hangsOverShoes && { hangsOverShoes }),
            ...(showsOnlyFeet && { showsOnlyFeet }),
            ...(coversFeet && { coversFeet }),
            byOrientation: Object.fromEntries(Object.keys(headOrientations).map((o) => [o, forView(o as HeadOrientation)])),
            fallback: forView("front")
        };
        byBottom.set(bottom, one);
    }
    return one;
}
