import { legFrames, type LegPose } from "./legPoses";
import { maskForView, type HeadOrientation } from "./orientation";
import { legsFrontMask } from "./masks/legsFront.mask";
import { legsSideMask } from "./masks/legsSide.mask";
import { legsFrontContactMask, legsSideContactMask } from "./masks/legs/legsContact.mask";

/** The legs in every pose and view. */
export const legsFrames = legFrames({ front: legsFrontMask, side: legsSideMask }, { front: legsFrontContactMask, side: legsSideContactMask });

/**
 * Which side of the picture the planted foot is on in a view: -1 for the left, 1 for the right, and 0 when neither is,
 * which is standing, and in profile, where both feet are down in a stride and look alike. It is read from the legs
 * themselves: the foot that is down is the one whose leg reaches lowest. Anything that should follow the contact foot asks
 * this, so it cannot drift from the drawing.
 */
export function plantedSide(pose: LegPose, view: HeadOrientation): -1 | 0 | 1 {
    const mask = maskForView(legsFrames[pose], view);
    const n = (mask[0].length - 1) >> 1;
    const lowest = (from: number, to: number) => mask.map((row) => row.slice(from, to).includes("1")).lastIndexOf(true);
    return Math.sign(lowest(mask[0].length - n, mask[0].length) - lowest(0, n)) as -1 | 0 | 1;
}

/**
 * Which half of the picture holds the arm drawn over, in a step, or undefined if none is. From the front it is the arm
 * that has come forward, on the planted foot's side; from behind the hand over its arm is the one swung back, on the
 * other side.
 */
export function armOver(pose: LegPose, view: HeadOrientation): "left" | "right" | undefined {
    const planted = plantedSide(pose, view);
    if (planted === 0) return undefined;
    return (view === "back" ? -planted : planted) > 0 ? "right" : "left";
}
