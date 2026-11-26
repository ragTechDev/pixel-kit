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

/** Moves the left or right arm's half of a front mask one column toward the middle. */
export function tuckArm(mask: PixelMask, half: "left" | "right"): PixelMask {
    const width = mask[0].length;
    const n = (width - 1) >> 1;
    return mask.map((row) => (half === "left" ? "0" + row.slice(0, n - 1) + row.slice(n) : row.slice(0, width - n) + row.slice(width - n + 1) + "0"));
}

/**
 * Every pose of a pair of arms, or of sleeves worn on them. They swing against the legs: the arm opposite the lifted
 * leg tucks in against the body and the one on the same side stays out. A side view keeps the arm as it is.
 */
export function armFrames(front: PixelMask, side: PixelMask): Record<LegPose, ViewMasks> {
    return legFrames({ front, side }, { front: tuckArm(front, "right"), side });
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
