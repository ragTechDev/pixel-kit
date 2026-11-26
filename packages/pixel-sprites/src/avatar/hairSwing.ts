import type { HairLayer } from "./styles/hairStyles";
import type { HeadOrientation } from "./orientation";
import type { LegPose } from "./legPoses";
import { plantedSide } from "./legs";

/** How far, in pixels, the end of a swinging lock moves each way. */
export const HAIR_SWING = 2;

/**
 * Which way the hair swings, as a sign: -1 toward the left of the picture, 1 toward the right. From the front and back it
 * is toward the planted foot, which the legs say. In profile both feet are down in a stride and look alike, so the hair
 * trails behind on a left-foot step, which is the left of the picture facing right and the right facing left, and swings
 * forward on a right-foot one.
 */
function direction(pose: LegPose, view: HeadOrientation): number {
    const planted = plantedSide(pose, view);
    if (planted !== 0) return planted;
    return view === "right" ? PROFILE_SIGN[pose] : view === "left" ? -PROFILE_SIGN[pose] : 0;
}
const PROFILE_SIGN = { neutral: 0, contactLeft: -1, contactRight: 1 } as const;

const swung = new WeakMap<HairLayer, Map<string, HairLayer>>();

/**
 * A layer of hair in a walking pose. The rows of a lock below its pivot (where it is tied, or where it leaves the head)
 * are shifted sideways, further the lower they are, so the top stays and the end swishes. Layers with no pivot are
 * the hair on the head, and do not move.
 */
export function swingHair(layer: HairLayer, pose: LegPose, view: HeadOrientation): HairLayer {
    const { swing } = layer;
    const amount = (swing?.reach ?? HAIR_SWING) * direction(pose, view);
    if (!swing || amount === 0) return layer;
    const key = `${pose}|${view}`;
    const cache = swung.get(layer) ?? new Map<string, HairLayer>();
    swung.set(layer, cache);
    let out = cache.get(key);
    if (!out) {
        const depth = layer.offsetY + layer.mask.length - 1 - swing.pivot;
        const shifts = layer.mask.map((_, r) => {
            const below = layer.offsetY + r - swing.pivot;
            return depth > 0 && below > 0 ? Math.round((amount * below) / depth) : 0;
        });
        const left = Math.max(0, -Math.min(...shifts));
        const right = Math.max(0, ...shifts);
        const mask = layer.mask.map((row, r) => "0".repeat(left + shifts[r]) + row + "0".repeat(right - shifts[r]));
        out = { ...layer, mask, offsetX: layer.offsetX - left };
        cache.set(key, out);
    }
    return out;
}
