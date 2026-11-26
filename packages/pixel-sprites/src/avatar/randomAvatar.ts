import { clothesPalettes, eyePalettes, hairPalettes, skinPalettes } from "../core/palette";
import { pieceColorFields, resolveAvatarConfig, type ResolvedAvatarConfig } from "./buildAvatar";
import { backHairStylesFor, frontHairStyles, hairDrapes, hairLengths, type HairLength } from "./styles/hairStyles";
import { hairAccessories } from "./styles/hairAccessories";
import { hairTextures } from "./styles/hairTextures";
import { bottomLengths, collars, skirtShapes, shoeStyles, sleeveLengths, topLengths, tucks } from "./styles/clothesStyles";

/** A small, fast generator (mulberry32): the same seed always gives the same run of numbers in [0, 1). */
function generator(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * A random avatar, dressed and with hair, facing front and standing. Every choice comes from the fixed tables, so it is always
 * a valid look: a top and a bottom (sometimes worn as a one-piece), hair of some length, and shoes, each piece sometimes in a
 * colour of its own. The same `seed` always gives the same avatar; leave it out for a different one each time. Change
 * `headOrientation` or `legPose` on the result to show it from another side or mid-step.
 */
export function randomAvatar(seed: number = Math.floor(Math.random() * 4294967296)): ResolvedAvatarConfig {
    const next = generator(seed);
    const pick = <T,>(options: readonly T[]): T => options[Math.floor(next() * options.length)];
    const keys = <T extends object>(table: T) => Object.keys(table) as Array<keyof T & string>;

    const hairLength = pick(keys(hairLengths).filter((id): id is Exclude<HairLength, "bald"> => id !== "bald"));
    const clothesColor = pick(keys(clothesPalettes));
    // Each piece often matches the clothes colour, and sometimes has a colour of its own.
    const colors = Object.fromEntries(pieceColorFields.map((field) => [field, next() < 0.5 ? clothesColor : pick(keys(clothesPalettes))]));

    return resolveAvatarConfig({
        headOrientation: "front",
        legPose: "neutral",
        skinTone: pick(keys(skinPalettes)),
        eyeColor: pick(keys(eyePalettes)),
        hairColor: pick(keys(hairPalettes)),
        hairLength,
        hairDrape: pick(keys(hairDrapes)),
        hairTexture: pick(keys(hairTextures)),
        frontHairStyle: pick(keys(frontHairStyles)),
        backHairStyle: pick(backHairStylesFor(hairLength)),
        hairAccessory: pick(keys(hairAccessories)),
        clothesColor,
        ...colors,
        topStyle: "top",
        topLength: pick(keys(topLengths)),
        sleeveLength: pick(keys(sleeveLengths)),
        collar: pick(keys(collars)),
        // A one-piece now and then; otherwise a top that reaches the bottom is tucked in or hangs over it.
        tuck: next() < 0.2 ? "onePiece" : pick(keys(tucks).filter((id) => id !== "onePiece")),
        bottomStyle: pick(["skirt", "pants"] as const),
        skirtShape: pick(keys(skirtShapes)),
        bottomLength: pick(keys(bottomLengths)),
        shoeStyle: pick(keys(shoeStyles).filter((id) => id !== "none"))
    });
}
