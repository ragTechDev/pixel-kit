import { composeSprites, layerBounds, type Layer, type Raster } from "../core/compose";
import { configKey } from "../core/cache";
import { mirrorMask, type PixelMask } from "../core/maskUtils";
import { clothesPalettes, eyePalettes, hairPalettes, skinPalettes } from "../core/palette";
import { defineSprite, rampSlots, shadeMask, SLOT, type Sprite } from "../core/sprite";
import { eyesFrontMask } from "./masks/eyesFront.mask";
import { eyesSideMask } from "./masks/eyesSide.mask";
import { headFrontMask } from "./masks/headFront.mask";
import { headSideMask } from "./masks/headSide.mask";
import { backHands, legPoses, splitHalves, type LegPose } from "./legPoses";
import { armOver, legsFrames } from "./legs";
import { swingLayer } from "./hairSwing";
import { armsFrames, handsFrames } from "./arms";
import { torsoFrontMask } from "./masks/torsoFront.mask";
import { torsoSideMask } from "./masks/torsoSide.mask";
import { accessoryParts, hairAccessories, type HairAccessory } from "./styles/hairAccessories";
import { hairTextures, textureMask, texturePad, type HairTexture } from "./styles/hairTextures";
import { headOrientations, maskForView, type HeadOrientation } from "./orientation";
import {
    bottomStyles,
    shoeStyles,
    skirtLengths,
    skirtShapes,
    skirtStyles,
    topStyles,
    type ArmPose,
    type BottomStyle,
    type GarmentDefinition,
    type GarmentLayer,
    type GarmentPlacement,
    type ShoeStyle,
    type SkirtLength,
    type SkirtShape,
    type TopStyle
} from "./styles/clothesStyles";
import {
    backHairStyles,
    backHairStylesFor,
    hairLengths,
    hairDrapes,
    hairDrapeApplies,
    hairAccessoryApplies,
    isLooseHair,
    isMiddlePonytail,
    frontHairStyles,
    resolveHairLayers,
    type BackHairStyle,
    type HairLength,
    type HairDrape,
    type FrontHairStyle,
    type HairLayer
} from "./styles/hairStyles";
import type { ClothesColor, EyeColor, HairColor, SkinTone } from "../core/palette";

export type { HeadOrientation };

/** An avatar is fully described by fixed style ids and palette keys. */
export interface AvatarConfig {
    headOrientation?: HeadOrientation;
    skinTone?: SkinTone;
    frontHairStyle?: FrontHairStyle;
    hairLength?: HairLength;
    /** Whether back hair falls over the shoulders or hangs behind them. Only hair that reaches the shoulders has the choice. */
    hairDrape?: HairDrape;
    hairTexture?: HairTexture;
    /** Ties up a ponytail or pigtails. Only tied hair has one. */
    hairAccessory?: HairAccessory;
    backHairStyle?: BackHairStyle;
    hairColor?: HairColor;
    eyeColor?: EyeColor;
    /** The colour of the clothes. Each piece uses it unless it has a colour of its own below. */
    clothesColor?: ClothesColor;
    /** Colours of single pieces. Left out, a piece follows `clothesColor`. */
    topColor?: ClothesColor;
    bottomColor?: ClothesColor;
    /** The colour of the hair accessory. Left out, it follows `clothesColor`. */
    hairAccessoryColor?: ClothesColor;
    shoeColor?: ClothesColor;
    topStyle?: TopStyle;
    bottomStyle?: BottomStyle;
    /** What kind of skirt a `skirt` bottom is. Only a skirt has one. */
    skirtShape?: SkirtShape;
    /** How far down a `skirt` bottom goes, from the one-row `mini` to `floor`, which covers the feet. Only a skirt has one. */
    skirtLength?: SkirtLength;
    shoeStyle?: ShoeStyle;
    armPose?: ArmPose;
    legPose?: LegPose;
}

/** The pieces that can take a colour of their own. */
export const pieceColorFields = ["topColor", "bottomColor", "shoeColor", "hairAccessoryColor"] as const;
export type PieceColorField = (typeof pieceColorFields)[number];

/** An avatar config with every choice filled in. A piece colour is only there when it differs from `clothesColor`. */
export type ResolvedAvatarConfig = Required<Omit<AvatarConfig, PieceColorField>> & Pick<AvatarConfig, PieceColorField>;

export const defaultAvatarConfig: Readonly<Required<Omit<AvatarConfig, PieceColorField>>> = {
    headOrientation: "front",
    skinTone: "light",
    frontHairStyle: "centerPart",
    hairLength: "shoulder",
    hairDrape: "overShoulder",
    hairTexture: "straight",
    hairAccessory: "none",
    backHairStyle: "lowPonytailRight",
    hairColor: "brown",
    eyeColor: "dark",
    clothesColor: "blue",
    topStyle: "shirt",
    bottomStyle: "shorts",
    skirtShape: "flowing",
    skirtLength: "mini",
    shoeStyle: "boots",
    armPose: "down",
    legPose: "neutral"
};

const ARM_POSES = { down: 1, forward: 1, back: 1 };

const allowed: { [K in Exclude<keyof AvatarConfig, PieceColorField>]-?: object } = {
    headOrientation: headOrientations,
    skinTone: skinPalettes,
    frontHairStyle: frontHairStyles,
    hairLength: hairLengths,
    hairDrape: hairDrapes,
    hairTexture: hairTextures,
    hairAccessory: hairAccessories,
    backHairStyle: backHairStyles,
    hairColor: hairPalettes,
    eyeColor: eyePalettes,
    clothesColor: clothesPalettes,
    topStyle: topStyles,
    bottomStyle: bottomStyles,
    skirtShape: skirtShapes,
    skirtLength: skirtLengths,
    shoeStyle: shoeStyles,
    armPose: ARM_POSES,
    legPose: legPoses
};

/**
 * Fills in defaults and replaces any unknown value with its default, so
 * configs loaded from storage or the network can never select anything
 * outside the fixed tables.
 */
export function resolveAvatarConfig(config: AvatarConfig = {}): ResolvedAvatarConfig {
    const out = { ...defaultAvatarConfig } as Record<string, string>;
    for (const key of Object.keys(allowed) as Array<keyof typeof allowed>) {
        const value = config[key];
        if (typeof value === "string" && Object.prototype.hasOwnProperty.call(allowed[key], value)) {
            out[key] = value;
        }
    }
    // A piece colour only counts when it differs from the clothes colour, so equivalent configs match.
    for (const key of pieceColorFields) {
        const value = config[key];
        if (typeof value === "string" && value !== out.clothesColor && Object.prototype.hasOwnProperty.call(clothesPalettes, value)) {
            out[key] = value;
        }
    }
    // Hair too short to tie up can only be loose.
    if (!backHairStylesFor(out.hairLength as HairLength).includes(out.backHairStyle as BackHairStyle)) out.backHairStyle = "looseBlunt";
    // Hair above the shoulders has no choice to make, so equivalent configs match.
    if (!hairDrapeApplies(out.hairLength as HairLength)) out.hairDrape = defaultAvatarConfig.hairDrape;
    // A tail down the middle hangs behind the head, so it has no shoulder to fall over.
    if (isMiddlePonytail(out.backHairStyle as BackHairStyle)) out.hairDrape = defaultAvatarConfig.hairDrape;
    // Only loose hair has some left to hang behind; a tail just falls over the shoulder.
    if (out.hairDrape === "overAndBehindShoulder" && !isLooseHair(out.backHairStyle as BackHairStyle)) out.hairDrape = defaultAvatarConfig.hairDrape;
    // Only tied hair has an accessory, and the colour of no accessory does not count.
    if (!hairAccessoryApplies(out.hairLength as HairLength, out.backHairStyle as BackHairStyle)) out.hairAccessory = "none";
    if (out.hairAccessory === "none") delete out.hairAccessoryColor;
    // Only a skirt that is not covered by a dress or overalls has a shape and a length, and the one-row mini skirt has no shape.
    if (out.bottomStyle !== "skirt" || (topStyles[out.topStyle as keyof typeof topStyles] as GarmentDefinition).coversBottom === true) {
        out.skirtShape = defaultAvatarConfig.skirtShape;
        out.skirtLength = defaultAvatarConfig.skirtLength;
    }
    if (out.skirtLength === "mini") out.skirtShape = defaultAvatarConfig.skirtShape;
    return out as ResolvedAvatarConfig;
}

/** Cache key for an avatar; equivalent configs (after defaults) share a key. */
export function avatarKey(config: AvatarConfig = {}): string {
    return configKey(resolveAvatarConfig(config));
}

const shaded = new WeakMap<PixelMask, Sprite>();
function shadedSprite(mask: PixelMask): Sprite {
    let sprite = shaded.get(mask);
    if (!sprite) {
        // An "S" in a mask is a fold line: part of the shape, but drawn in the shadow colour (the sprite is padded one pixel).
        sprite = shadeMask(mask.some((row) => row.includes("S")) ? mask.map((row) => row.replace(/S/g, "1")) : mask);
        mask.forEach((row, y) => {
            for (let x = 0; x < row.length; x += 1) if (row[x] === "S") (sprite as { px: Uint8Array }).px[(y + 1) * sprite!.width + x + 1] = SLOT.shadow;
        });
        shaded.set(mask, sprite);
    }
    return sprite;
}

// A hair accessory is thin, so shading would turn every pixel into a highlight or a shadow and none would be the
// colour that was picked. It is drawn in its base colour instead, with an outline unless it is too thin for one.
const flat = { outlined: new WeakMap<PixelMask, Sprite>(), bare: new WeakMap<PixelMask, Sprite>() };
function flatSprite(mask: PixelMask, outlined: boolean): Sprite {
    const cache = outlined ? flat.outlined : flat.bare;
    let sprite = cache.get(mask);
    if (!sprite) {
        const shadedOne = shadedSprite(mask);
        sprite = {
            ...shadedOne,
            px: shadedOne.px.map((slot) => (slot === SLOT.highlight || slot === SLOT.shadow ? SLOT.base : slot === SLOT.outline && !outlined ? 0 : slot))
        };
        cache.set(mask, sprite);
    }
    return sprite;
}

const headMasks = { front: headFrontMask, side: headSideMask };
const torsoMasks = { front: torsoFrontMask, side: torsoSideMask };
const eyesLegend = { "1": SLOT.base, H: SLOT.highlight };
const eyesSprites = { front: defineSprite(eyesFrontMask, eyesLegend), side: defineSprite(eyesSideMask, eyesLegend) };

function garmentLayersFor(def: GarmentDefinition, orientation: HeadOrientation): readonly GarmentLayer[] {
    return def.byOrientation[orientation] ?? def.fallback;
}

/** Composes an avatar into a colour-resolved raster. Pure; cache by `avatarKey`. */
export function buildAvatar(config: AvatarConfig = {}): Raster {
    const c = resolveAvatarConfig(config);
    const o = c.headOrientation;
    const skin = rampSlots(skinPalettes[c.skinTone]);
    const hair = rampSlots(hairPalettes[c.hairColor]);
    const eyes = rampSlots(eyePalettes[c.eyeColor]);
    const clothesSlots = (color: ClothesColor | undefined) => rampSlots(clothesPalettes[color ?? c.clothesColor]);

    const layer = (mask: PixelMask, slots: readonly string[], x: number, y: number): Layer => ({
        sprite: shadedSprite(mask),
        slots,
        x,
        y
    });

    const hairLayers: readonly HairLayer[] = resolveHairLayers(c.frontHairStyle, c.backHairStyle, c.hairLength, c.hairDrape, o);
    // In a walking pose the lower hair swishes. The size covers both swings, so the avatar keeps it in every pose.
    const hairIn = (pose: LegPose) => hairLayers.map((h) => swingLayer(h, pose, o));
    const hairNow = hairIn(c.legPose);
    // A one-piece top (a dress, overalls) covers the legs, so nothing is drawn for the bottom.
    const coversBottom = (topStyles[c.topStyle] as GarmentDefinition).coversBottom === true;
    const piece = (layers: readonly GarmentLayer[], color: ClothesColor | undefined) => {
        const slots = clothesSlots(color);
        return layers.map((l) => ({ ...l, slots }));
    };
    // A long skirt hangs over the tops of the shoes, so then the shoes are drawn before it, with the clothes on the body.
    // A flowing or pleated skirt sways in a walking pose.
    const bottomDefinition = (c.bottomStyle === "skirt" ? skirtStyles[c.skirtShape][c.skirtLength] : bottomStyles[c.bottomStyle]) as GarmentDefinition;
    // An ankle-length skirt stops just above the feet, so only the last row of the legs and shoes shows under it, and a
    // floor-length one covers them, so there are no shoes or legs to draw.
    const coversFeet = !coversBottom && bottomDefinition.coversFeet === true;
    const feetOnly = !coversBottom && bottomDefinition.showsOnlyFeet === true;
    const underSkirt = !coversBottom && (bottomDefinition.hangsOverShoes === true || feetOnly);
    const lastRow = (mask: PixelMask): PixelMask => mask.map((row, y) => (y === mask.length - 1 ? row : "0".repeat(row.length)));
    const shoes = (coversFeet ? [] : piece(garmentLayersFor(shoeStyles[c.shoeStyle], o), c.shoeColor)).map((g) => ({
        ...g,
        ...(underSkirt ? { placement: "overBody" as const } : {}),
        ...(feetOnly ? { mask: lastRow(g.poses?.[c.legPose] ?? g.mask), poses: undefined } : {})
    }));
    const garmentsFor = (pose: LegPose) => [
        ...piece(garmentLayersFor(topStyles[c.topStyle], o), c.topColor),
        ...(underSkirt ? shoes : []),
        ...(coversBottom ? [] : piece(garmentLayersFor(bottomDefinition, o).map((l) => swingLayer(l, pose, o)), c.bottomColor)),
        ...(underSkirt ? [] : shoes)
    ];
    const garments = garmentsFor(c.legPose);

    const garmentsAt = (placement: GarmentPlacement) =>
        garments
            .filter((g) => g.placement === placement && (!g.armPoses || g.armPoses.includes(c.armPose)))
            .map((g) => layer(g.poses?.[c.legPose] ?? g.mask, g.slots, g.offsetX, g.offsetY));
    const hairBody = [hair[SLOT.base], hair[SLOT.shadow], hair[SLOT.highlight]];
    // A texture widens the mask on both sides, so the layer moves left by the same amount to stay in place.
    const hairLayer = (h: HairLayer): Layer => ({
        ...layer(textureMask(h.mask, c.hairTexture), hair, h.offsetX - texturePad(c.hairTexture), h.offsetY),
        ...(h.blends ? { noOutlineOver: hairBody, noHighlightOver: hairBody } : {})
    });
    // An accessory sits where a tail is tied, in the same group as the tail and just after it.
    const accessorySlots = rampSlots(clothesPalettes[c.hairAccessoryColor ?? c.clothesColor]);
    const flatLayer = (mask: PixelMask, outlined: boolean, x: number, y: number): Layer => ({ sprite: flatSprite(mask, outlined), slots: accessorySlots, x, y });
    const accessoryLayers = (h: HairLayer): Layer[] => {
        if (c.hairAccessory === "none" || !h.tie) return [];
        const { mask, above, tilted, outlined } = accessoryParts[c.hairAccessory];
        const { x, y, tilt } = h.tie;
        // A band slants across a sloping tail, through the tie point; anything else lies flat, centred on it.
        if (tilt) {
            const width = tilted.mask[0].length;
            return tilt === "slash"
                ? [flatLayer(tilted.mask, outlined, x - tilted.centre, y - tilted.up)]
                : [flatLayer(mirrorMask(tilted.mask), outlined, x - (width - 1 - tilted.centre), y - tilted.up)];
        }
        return [flatLayer(mask, outlined, x - Math.floor(mask[0].length / 2), y - above)];
    };
    // An accessory goes just after its tail, or just before it where the tail falls over the tie.
    const withAccessory = (h: HairLayer): Layer[] => (h.tie?.under ? [...accessoryLayers(h), hairLayer(h)] : [hairLayer(h), ...accessoryLayers(h)]);
    const hairAt = (placement: HairLayer["placement"]) => hairNow.filter((h) => h.placement === placement).flatMap(withAccessory);

    const legs = layer(feetOnly ? lastRow(maskForView(legsFrames[c.legPose], o)) : maskForView(legsFrames[c.legPose], o), skin, 2, 13);
    const torso = layer(maskForView(torsoMasks, o), skin, 2, 6);
    const inProfile = o === "left" || o === "right";
    // In a walking pose, from the front the arm that has come in close to the body is drawn over the clothes, and from
    // behind both are, so that no sleeve is left over a hidden arm.
    const armsMask = maskForView(armsFrames[c.legPose], o);
    const over = armOver(c.legPose, o);
    const walking = over !== undefined;
    const armSplit = splitHalves(armsMask, o === "front" ? over : undefined);
    const arms = layer(o === "back" && walking ? armSplit.side : armSplit.rest, skin, 0, 6);
    // Where that arm lies over the top or the bottom it has no outline of its own, so it is not boxed in against the body.
    const clothesUnder = [...clothesSlots(c.topColor), ...clothesSlots(c.bottomColor)].filter(Boolean);
    const armOverClothes = !walking ? [] : [{ ...layer(o === "back" ? armSplit.rest : armSplit.side, skin, 0, 6), noOutlineOver: clothesUnder }];
    // The hands are drawn over the clothes, so an arm swung in front has its hand overlapping the body. From behind the
    // arm is over the hand, so the hand goes under it, except the hand of an arm swung back toward the viewer.
    const handMask = maskForView(handsFrames[c.legPose], o);
    const behind = o === "back" ? backHands(handMask, over) : undefined;
    const hands = layer(behind ? behind.over : handMask, skin, 0, 6);
    const handsUnder = behind ? [layer(behind.under, skin, 0, 6)] : [];
    // Loose hair frames the face, so the head has no outline where it sits against that hair.
    const head: Layer = {
        ...layer(maskForView(headMasks, o), skin, 1, -5),
        ...(isLooseHair(c.backHairStyle) && c.hairLength !== "bald" ? { noOutlineOver: hairBody } : {})
    };
    // The back of the head has no face. In profile one eye sits near the face side of the head.
    const eyeLayers: Layer[] =
        o === "front"
            ? [{ sprite: eyesSprites.front, slots: eyes, x: 3, y: 1 }]
            : o === "back"
              ? []
              : [{ sprite: eyesSprites.side, slots: eyes, x: o === "right" ? 8 : 4, y: 1 }];

    const layers: Layer[] = [
        ...hairAt("behindBody"),
        ...garmentsAt("behindBody"),
        ...(coversFeet ? [] : [legs]),
        torso,
        // In profile the arm hangs in front of the torso, so it goes over the clothes on the body.
        ...handsUnder,
        ...(inProfile ? [] : [arms]),
        ...garmentsAt("overBody"),
        ...(inProfile ? [arms] : armOverClothes),
        ...garmentsAt("overArms"),
        hands,
        ...hairAt("behindHead"),
        head,
        ...eyeLayers,
        ...hairAt("front"),
        ...garmentsAt("overlay"),
        ...hairAt("top")
    ];

    // Bounds include every candidate layer (even pose-hidden ones) and the front-view body, so the
    // avatar keeps the same size and alignment across poses and when it turns.
    const bounds = layerBounds([
        layer(maskForView(legsFrames.neutral, "front"), skin, 2, 13),
        layer(maskForView(torsoMasks, "front"), skin, 2, 6),
        layer(maskForView(armsFrames.neutral, "front"), skin, 0, 6),
        layer(maskForView(headMasks, "front"), skin, 1, -5),
        legs,
        torso,
        arms,
        head,
        ...[...hairLayers, ...hairIn("contactLeft"), ...hairIn("contactRight")].flatMap(withAccessory),
        ...[...garments, ...garmentsFor("contactLeft"), ...garmentsFor("contactRight")].map((g) => layer(g.mask, g.slots, g.offsetX, g.offsetY))
    ]);

    return composeSprites(layers, bounds);
}
