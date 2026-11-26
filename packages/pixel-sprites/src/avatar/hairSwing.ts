import type { PixelMask } from "../core/maskUtils";
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
export function direction(pose: LegPose, view: HeadOrientation): number {
    const planted = plantedSide(pose, view);
    if (planted !== 0) return planted;
    return view === "right" ? PROFILE_SIGN[pose] : view === "left" ? -PROFILE_SIGN[pose] : 0;
}
const PROFILE_SIGN = { neutral: 0, contactLeft: -1, contactRight: 1 } as const;

/** What can swing: a layer of hair or of clothing, with a mask, where it sits and how it swings. */
export interface SwingLayer {
    readonly mask: PixelMask;
    readonly offsetX: number;
    readonly offsetY: number;
    readonly swing?: { readonly pivot: number; readonly reach?: number; readonly up?: true };
    readonly tie?: { readonly x: number; readonly y: number };
}

const swung = new WeakMap<object, Map<string, SwingLayer>>();

/**
 * A layer of hair or clothing in a walking pose. The rows of a lock below its pivot (where it is tied, or where it leaves
 * the head) are shifted sideways, further the lower they are, so the top stays and the end swishes, or a skirt's hem sways.
 * Layers with no pivot are the hair on the head, or clothing that does not move, and are returned as they are.
 */
export function swingLayer<T extends SwingLayer>(layer: T, pose: LegPose, view: HeadOrientation): T {
    const { swing } = layer;
    const amount = (swing?.reach ?? HAIR_SWING) * direction(pose, view);
    if (!swing || amount === 0) return layer;
    const key = `${pose}|${view}`;
    const cache = swung.get(layer) ?? new Map<string, SwingLayer>();
    swung.set(layer, cache);
    let out = cache.get(key);
    if (!out) {
        const top = layer.offsetY;
        const bottom = layer.offsetY + layer.mask.length - 1;
        // A lock that points up from its root (a tuft) moves the rows above the pivot. A hanging one moves the rows below it,
        // and a short one swings from its second-to-last row up: a chin-length tail is tied on its last row and slopes along
        // its whole length.
        const up = swing.up === true;
        const pivot = up ? swing.pivot : Math.min(swing.pivot, bottom - 2);
        const depth = up ? pivot - top : bottom - pivot;
        const shiftAt = (y: number) => {
            const away = up ? pivot - y : y - pivot;
            return depth > 0 && away > 0 ? Math.round((amount * away) / depth) : 0;
        };
        const shifts = layer.mask.map((_, r) => shiftAt(layer.offsetY + r));
        const left = Math.max(0, -Math.min(...shifts));
        const right = Math.max(0, ...shifts);
        const mask = layer.mask.map((row, r) => "0".repeat(left + shifts[r]) + row + "0".repeat(right - shifts[r]));
        // What is tied on the lock goes with it.
        const tie = layer.tie && { ...layer.tie, x: layer.tie.x + shiftAt(layer.tie.y) };
        out = { ...layer, mask, offsetX: layer.offsetX - left, ...(tie ? { tie } : {}) };
        cache.set(key, out);
    }
    return out as T;
}
