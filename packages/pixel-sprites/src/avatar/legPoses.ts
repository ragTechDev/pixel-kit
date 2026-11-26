import { mirrorMask, type PixelMask } from "../core/maskUtils";
import type { ViewMasks } from "./orientation";

export const legPoses = { neutral: 1, contactLeft: 1, contactRight: 1 } as const;
/** Where the legs are in a step. `neutral` is standing; the others are the two steps of a walk, named for the character's own foot. */
export type LegPose = keyof typeof legPoses;
/** The legs of a walk in order. Play them in a loop: a foot swings through, both feet are down, the other foot swings, both are down. */
export const walkCycle = ["contactLeft", "neutral", "contactRight", "neutral"] as const satisfies readonly LegPose[];

/** Rows in the legs. Anything worn on them is drawn in this frame so its pose can move with the leg. */
export const LEG_ROWS = 4;

/**
 * Every pose of a pair of legs, from the neutral masks and the left-foot contact. The right-foot contact is the left
 * one flipped. Seen from behind, the left foot is on the viewer's left, so the back view is the front flipped again.
 * A side view cannot show which foot leads, so both feet share it.
 */
export function legFrames(neutral: ViewMasks, contact: ViewMasks): Record<LegPose, ViewMasks> {
    return {
        neutral,
        contactLeft: { front: contact.front, side: contact.side, back: mirrorMask(contact.front) },
        contactRight: { front: mirrorMask(contact.front), side: contact.side, back: contact.front }
    };
}

/** Moves the left or right leg's half of a front mask up, leaving the middle column alone. Nothing comes in from below. */
export function liftFoot(mask: PixelMask, half: "left" | "right", rows: number): PixelMask {
    const width = mask[0].length;
    const n = (width - 1) >> 1;
    const from = (y: number) => mask[y + rows] ?? "0".repeat(width);
    return mask.map((row, y) => (half === "left" ? from(y).slice(0, n) + row.slice(n) : row.slice(0, width - n) + from(y).slice(width - n)));
}

/** Rows in a front arm once it has swung forward: one more than standing, where the hand is lowest. */
const ARM_ROWS = 7;

/**
 * Swings the two arms of a front mask in depth, the shoulders staying put. An arm swung back is foreshortened: two
 * rows shorter, ending in the shape of the hand. An arm swung forward comes toward the viewer: a row longer.
 */
export function swingArms(mask: PixelMask, left: "forward" | "back", right: "forward" | "back"): PixelMask {
    const width = mask[0].length;
    const n = (width - 1) >> 1;
    const rows = [...mask, ...Array(ARM_ROWS - mask.length).fill("0".repeat(width))];
    const swing = (half: string[], dir: "forward" | "back") =>
        half.map((row, y) => (dir === "back" ? (y === 3 ? half[5] : y > 3 ? "0".repeat(n) : row) : y === 5 ? half[4] : y === 6 ? half[5] : row));
    const l = swing(rows.map((row) => row.slice(0, n)), left);
    const r = swing(rows.map((row) => row.slice(width - n)), right);
    return rows.map((row, y) => l[y] + row.slice(n, width - n) + r[y]);
}

/**
 * Every pose of a pair of arms, or of sleeves worn on them. They swing against the legs: the arm on the side of the
 * lifted leg swings forward and the other swings back. A side view keeps the arm as it is.
 */
export function armFrames(front: PixelMask, side: PixelMask): Record<LegPose, ViewMasks> {
    return legFrames({ front, side }, { front: swingArms(front, "forward", "back"), side });
}

/**
 * Makes the left or right leg's half of a front mask smaller, as a foot is when it goes back: one column narrower on
 * the outside, and tapering at the bottom so it points down (a row with a single pixel is left alone).
 */
export function smallerFoot(mask: PixelMask, half: "left" | "right"): PixelMask {
    const n = (mask[0].length - 1) >> 1;
    const [outer, inner] = half === "left" ? [0, n - 1] : [mask[0].length - 1, mask[0].length - n];
    const clear = (row: string, x: number) => row.slice(0, x) + "0" + row.slice(x + 1);
    const slim = mask.map((row) => clear(row, outer));
    const [from, to] = half === "left" ? [0, n] : [mask[0].length - n, mask[0].length];
    const bottom = slim.map((row) => row.slice(from, to).includes("1")).lastIndexOf(true);
    return slim.map((row, y) => (y === bottom && row.slice(from, to).split("1").length > 2 ? clear(row, inner) : row));
}

/** Pads a mask of the lowest rows of the legs (a shoe, a sandal) up to the full leg frame. */
export function onLegs(mask: PixelMask): PixelMask {
    return [...Array(LEG_ROWS - mask.length).fill("0".repeat(mask[0].length)), ...mask];
}
