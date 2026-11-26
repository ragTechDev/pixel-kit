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
 * one flipped. Seen from behind, the left foot is on the viewer's left, so the back view is the front flipped again
 * (or `contact.back`, flipped, if it is drawn). A side view cannot show which foot leads, so both feet share it unless `sideRight` gives the right-foot frame its own.
 */
export function legFrames(neutral: ViewMasks, contact: ViewMasks, sideRight: PixelMask = contact.side): Record<LegPose, ViewMasks> {
    return {
        neutral,
        contactLeft: { front: contact.front, side: contact.side, back: mirrorMask(contact.back ?? contact.front) },
        contactRight: { front: mirrorMask(contact.front), side: sideRight, back: contact.back ?? contact.front }
    };
}

/** Moves the left or right leg's half of a front mask up, leaving the middle column alone. Nothing comes in from below. */
export function liftFoot(mask: PixelMask, half: "left" | "right", rows: number): PixelMask {
    const width = mask[0].length;
    const n = (width - 1) >> 1;
    const from = (y: number) => mask[y + rows] ?? "0".repeat(width);
    return mask.map((row, y) => (half === "left" ? from(y).slice(0, n) + row.slice(n) : row.slice(0, width - n) + from(y).slice(width - n)));
}

/** Rows in a front arm once it has swung back: one more than standing, where the hand is lowest. */
const ARM_ROWS = 7;

/**
 * Swings the two arms of a front mask in depth, the shoulders staying put. An arm swung forward comes in close to the
 * body, so it looks smaller: two rows shorter, angled `columns` columns inward from just below the shoulder and ending in the shape of the hand. An arm swung
 * back reaches out from the body: a row longer. Sleeves swing the same way and are then cut to the arm.
 */
export function swingArms(mask: PixelMask, left: "forward" | "back", right: "forward" | "back", columns = 1): PixelMask {
    const width = mask[0].length;
    const n = (width - 1) >> 1;
    const rows = [...mask, ...Array(ARM_ROWS - mask.length).fill("0".repeat(width))];
    const swing = (half: string[], dir: "forward" | "back", inward: (row: string) => string) =>
        half.map((row, y) =>
            dir === "back"
                ? y === 5 ? half[4] : y === 6 ? half[5] : row
                : y === 1 || y === 2 ? inward(row) : y === 3 ? inward(half[5]) : y > 3 ? "0".repeat(n) : row
        );
    const l = swing(rows.map((row) => row.slice(0, n)), left, (row) => (columns ? "0".repeat(columns) + row.slice(0, -columns) : row));
    const r = swing(rows.map((row) => row.slice(width - n)), right, (row) => row.slice(columns) + "0".repeat(columns));
    return rows.map((row, y) => l[y] + row.slice(n, width - n) + r[y]);
}

/** The pixels of a mask that are also filled in another of the same size. */
export function within(mask: PixelMask, bounds: PixelMask): PixelMask {
    return mask.map((row, y) => [...row].map((c, x) => (c === "1" && bounds[y]?.[x] === "1" ? "1" : "0")).join(""));
}

/**
 * Every pose of the sleeves of a top, given the poses of the arms they cover. A sleeve swings as its arm does and is
 * then cut to the arm, so it never sticks out past it. `swing` is as for `armFrames`.
 */
export function sleeveFrames(front: PixelMask, side: PixelMask, arms: Record<LegPose, ViewMasks>, swing?: { forward: PixelMask; back: PixelMask }): Record<LegPose, ViewMasks> {
    const swung = (columns: number, bounds: PixelMask) => within(swingArms(front, "back", "forward", columns), bounds);
    return legFrames(
        { front, side },
        { front: swung(INWARD.front, arms.contactLeft.front), side: swing?.forward ?? side, back: swung(INWARD.back, mirrorMask(arms.contactLeft.back ?? arms.contactLeft.front)) },
        swing?.back ?? side
    );
}

/**
 * Narrows the lowest two rows of each arm in a front mask by its inner column, so the end of an arm swung back is
 * skinnier. The outer column stays, so the hand still sits on the end.
 */
export function slimmerEnd(mask: PixelMask): PixelMask {
    const n = (mask[0].length - 1) >> 1;
    return mask.map((row, y) => {
        if (y !== 4 && y !== 5) return row;
        const left = row.slice(0, n);
        const right = row.slice(row.length - n);
        const l = left.lastIndexOf("1");
        const r = right.indexOf("1");
        const slimLeft = l > left.indexOf("1") ? left.slice(0, l) + "0" + left.slice(l + 1) : left;
        const slimRight = r >= 0 && r < right.lastIndexOf("1") ? right.slice(0, r) + "0" + right.slice(r + 1) : right;
        return slimLeft + row.slice(n, row.length - n) + slimRight;
    });
}

/** Takes the outer column off the arm in the left or right half of a front mask, wherever it is more than one wide. */
export function narrowerArm(mask: PixelMask, half: "left" | "right"): PixelMask {
    const width = mask[0].length;
    const n = (width - 1) >> 1;
    const [from, to] = half === "left" ? [0, n] : [width - n, width];
    return mask.map((row) => {
        const part = row.slice(from, to);
        const outer = half === "left" ? part.indexOf("1") : part.lastIndexOf("1");
        const thin = part.split("1").length > 2 ? part.slice(0, outer) + "0" + part.slice(outer + 1) : part;
        return row.slice(0, from) + thin + row.slice(to);
    });
}

/** How many columns the arm swung forward angles in, from the front and from behind. From behind it stays out at the shoulder, or it would look tucked back. */
const INWARD = { front: 1, back: 0 } as const;

/**
 * Every pose of a pair of arms, or of sleeves worn on them. They swing against the legs: from the front the arm opposite
 * the lifted leg swings forward and the one on its side back, and in profile the arm swings forward on a left-foot step
 * and back on a right-foot one. `swing` gives the two profile arms; without it a side view keeps the arm as it is.
 */
export function armFrames(front: PixelMask, side: PixelMask, swing?: { forward: PixelMask; back: PixelMask }): Record<LegPose, ViewMasks> {
    // Seen from behind the arm that comes forward stays out at the shoulder, and is shorter and thinner as it moves away.
    const swung = (columns: number) => slimmerEnd(swingArms(front, "back", "forward", columns));
    return legFrames({ front, side }, { front: swung(INWARD.front), side: swing?.forward ?? side, back: narrowerArm(swung(INWARD.back), "right") }, swing?.back ?? side);
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

/** One hand: a solid square this big at the end of the arm in `region` (a range of columns), on its `edge` side. */
export type HandSpec = { region: readonly [number, number]; size: number; edge: "left" | "right" };

/**
 * The hands of an arm mask: a small solid square at the end of each arm, which the outline then rounds. The square sits
 * on the arm's outer column and ends on the arm's lowest row.
 */
export function handsOf(mask: PixelMask, specs: readonly HandSpec[]): PixelMask {
    const width = mask[0].length;
    const grid = mask.map(() => Array<string>(width).fill("0"));
    for (const { region: [from, to], size, edge } of specs) {
        const cells = mask.flatMap((row, y) => [...row.slice(from, to)].flatMap((c, x) => (c === "1" ? [[x + from, y]] : [])));
        const bottom = Math.max(...cells.map(([, y]) => y));
        const outer = edge === "left" ? Math.min(...cells.map(([x]) => x)) : Math.max(...cells.map(([x]) => x));
        const left = edge === "left" ? outer : outer - size + 1;
        for (let y = bottom - size + 1; y <= bottom; y += 1) for (let x = left; x < left + size; x += 1) if (y >= 0 && x >= 0 && x < width) grid[y][x] = "1";
    }
    return grid.map((row) => row.join(""));
}

/** A hand is this many pixels square in every pose. */
const HAND_SIZE = 2;

/**
 * Every pose of the hands, from the arms: round, the same size in every pose, and on the outside of each arm so they
 * sit clear of the body. In profile the hand sits on the end of the arm.
 */
export function handFrames(arms: Record<LegPose, ViewMasks>): Record<LegPose, ViewMasks> {
    const { neutral, contactLeft, contactRight } = arms;
    const width = neutral.front[0].length;
    const n = (width - 1) >> 1;
    const front = (mask: PixelMask) =>
        handsOf(mask, [
            { region: [0, n], size: HAND_SIZE, edge: "left" },
            { region: [width - n, width], size: HAND_SIZE, edge: "right" }
        ]);
    const side = (mask: PixelMask, edge: "left" | "right") => handsOf(mask, [{ region: [0, mask[0].length], size: HAND_SIZE, edge }]);
    return legFrames(
        { front: front(neutral.front), side: side(neutral.side, "right") },
        { front: front(contactLeft.front), side: side(contactLeft.side, "right") },
        side(contactRight.side, "left")
    );
}

/** Splits a front or back mask into the half on `side` and the other half, each the size of the original. */
export function splitHalves(mask: PixelMask, side: "left" | "right" | undefined): { side: PixelMask; rest: PixelMask } {
    const width = mask[0].length;
    const n = (width - 1) >> 1;
    const keep = (row: string, half: "left" | "right") => (half === "left" ? row.slice(0, n) + "0".repeat(width - n) : "0".repeat(width - n) + row.slice(width - n));
    const blank = mask.map((row) => "0".repeat(row.length));
    return side ? { side: mask.map((row) => keep(row, side)), rest: mask.map((row) => keep(row, side === "left" ? "right" : "left")) } : { side: blank, rest: mask };
}

/**
 * The back view's hands as two masks. The arm is over the hand, so a hand hangs a row lower and shows from under the end
 * of the arm, as it does standing. In a step the arm swung back keeps its hand on the arm's end, over it, and the arm
 * swung forward is moving away from the viewer, so its hand is out of sight behind the arm.
 */
export function backHands(hands: PixelMask, over: "left" | "right" | undefined): { under: PixelMask; over: PixelMask } {
    const { side, rest } = splitHalves(hands, over);
    return { under: over ? hands.map((row) => "0".repeat(row.length)) : ["0".repeat(hands[0].length), ...rest], over: side };
}
