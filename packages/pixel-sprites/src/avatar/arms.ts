import { armFrames, handFrames } from "./legPoses";
import { armsFrontMask } from "./masks/armsFront.mask";
import { armsSideMask } from "./masks/armsSide.mask";
import { armsSideBackMask } from "./masks/armsSideBack.mask";
import { armsSideForwardMask } from "./masks/armsSideForward.mask";

/** The arms in every pose and view, and the hands on the end of them. */
export const armsFrames = armFrames(armsFrontMask, armsSideMask, { forward: armsSideForwardMask, back: armsSideBackMask });
export const handsFrames = handFrames(armsFrames);
