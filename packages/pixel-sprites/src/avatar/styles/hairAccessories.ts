import type { PixelMask } from "../../core/maskUtils";
import { bowTiltedMask } from "../masks/hair/accessories/bowTilted.mask";
import { bowMask } from "../masks/hair/accessories/bow.mask";
import { hairtieTiltedMask } from "../masks/hair/accessories/hairtieTilted.mask";
import { hairtieMask } from "../masks/hair/accessories/hairtie.mask";
import { scrunchieTiltedMask } from "../masks/hair/accessories/scrunchieTilted.mask";
import { scrunchieMask } from "../masks/hair/accessories/scrunchie.mask";
import { throwbackFrontMask } from "../masks/hair/accessories/headscarf/throwbackFront.mask";
import { throwbackSideMask } from "../masks/hair/accessories/headscarf/throwbackSide.mask";
import { throwbackSideLeftMask } from "../masks/hair/accessories/headscarf/throwbackSideLeft.mask";
import { throwbackBackMask } from "../masks/hair/accessories/headscarf/throwbackBack.mask";
import { tuckedFrontMask } from "../masks/hair/accessories/headscarf/tuckedFront.mask";
import { tuckedSideMask } from "../masks/hair/accessories/headscarf/tuckedSide.mask";
import { tuckedBackMask } from "../masks/hair/accessories/headscarf/tuckedBack.mask";
import type { HeadOrientation, ViewMasks } from "../orientation";

/**
 * Something worn in the hair. A hairtie, scrunchie or bow ties up a ponytail or pigtails; a headscarf is wrapped over the
 * head instead, so it goes with any hairstyle. Each takes a colour of its own.
 */
export const hairAccessories = { none: 1, hairtie: 1, scrunchie: 1, bow: 1, headscarf: 1 } as const;
export type HairAccessory = keyof typeof hairAccessories;

/** The accessories that tie up a tail, and so need tied hair. */
export type TieAccessory = Exclude<HairAccessory, "none" | "headscarf">;

/** How a headscarf is worn. Only a headscarf has one. */
export const headscarfStyles = { throwback: 1, tucked: 1 } as const;
export type HeadscarfStyle = keyof typeof headscarfStyles;

/**
 * The headscarf in each style, drawn over the head and shoulders. The same masks are used for
 * every hairstyle: a scarf covers the hair, so none is drawn under it. They are placed `headscarfOffset` from the head's
 * own position.
 */
export const headscarfMasks: Record<HeadscarfStyle, ViewMasks> = {
    throwback: { front: throwbackFrontMask, side: throwbackSideMask, left: throwbackSideLeftMask, back: throwbackBackMask },
    tucked: { front: tuckedFrontMask, side: tuckedSideMask, back: tuckedBackMask }
};
export const headscarfOffset = { x: -1, y: 0 } as const;

/**
 * Loose ends that sway in a walking pose, as the row of the mask they leave the drape on, in each view that has them: the
 * rows below it swing from there, like a tail of hair, so they must hold nothing but the ends. Only the throwback scarf has
 * them. Facing right the end is on the far shoulder, out of sight.
 */
export const headscarfSwingRows: Partial<Record<HeadscarfStyle, Partial<Record<HeadOrientation, number>>>> = { throwback: { front: 12, back: 12, left: 12 } };

/**
 * A mask that slants across a sloping tail. `centre` is the column of the mask that goes on the tie, in the mask
 * as drawn for a tail that slopes down to the right, and `up` is how many rows of it are above the tie row.
 */
export type TiltedMask = { mask: PixelMask; centre: number; up: number };

/**
 * The mask of each accessory, and how many rows it reaches above the row the tail is tied on. Every accessory
 * also has a tilted mask, for a tail that slopes: it slants across the tail instead of lying flat.
 */
export const accessoryParts: Record<TieAccessory, { mask: PixelMask; above: number; tilted: TiltedMask; outlined: boolean }> = {
    // A hairtie is a single line of pixels, so it is drawn in its colour alone: an outline would be most of it.
    hairtie: { mask: hairtieMask, above: 0, tilted: { mask: hairtieTiltedMask, centre: 1, up: 1 }, outlined: false },
    scrunchie: { mask: scrunchieMask, above: 1, tilted: { mask: scrunchieTiltedMask, centre: 2, up: 1 }, outlined: true },
    bow: { mask: bowMask, above: 1, tilted: { mask: bowTiltedMask, centre: 2, up: 2 }, outlined: true }
};
