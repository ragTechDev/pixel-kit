import type { Size } from "./camera";
import type { Direction } from "./input";

/**
 * Where the carrying has got to. `reach`: bending to the object. `lift`: raising it from where it was to above the head. `show`: held up
 * there for a moment, so the player sees what it is. `hold`: carried in front, until `drop`.
 */
export type CarryPhase = "empty" | "reach" | "lift" | "show" | "hold";

export interface CarryOptions {
    /** Seconds spent bending to the object. Default 0.2. */
    reach?: number;
    /** Seconds spent raising it overhead. Default 0.3. */
    lift?: number;
    /** Seconds spent holding it overhead. Default 0.45. */
    show?: number;
    /** Seconds it takes to come down from overhead to the carrying position. Default 0.15. */
    settle?: number;
}

/** Where to draw the avatar and what it carries on one frame. Positions are whole pixels, relative to the top-left of the avatar's picture. */
export interface CarryPose {
    /** Top-left of the object's picture. Negative is above or left of the avatar. */
    readonly x: number;
    readonly y: number;
    /** Pixels to draw the avatar lower by, while it bends down. */
    readonly crouch: number;
    /** True when the avatar should be drawn over the object (the object is in front of its back). */
    readonly behind: boolean;
}

export interface Carry<T> {
    readonly phase: CarryPhase;
    /** What is being carried, from the moment it is picked up until `drop`. */
    readonly item: T | undefined;
    /** True while the avatar bends, lifts and shows the object: a game keeps the avatar still for it. */
    readonly busy: boolean;
    /** Starts picking `item` up from where it lies: `from` is the top-left of its picture, relative to the avatar's. False if something is already held. */
    pickUp(item: T, from: { x: number; y: number }): boolean;
    /** Puts down what is held and returns it, or returns undefined if nothing is held. */
    drop(): T | undefined;
    /** Moves the animation on by `dt` seconds. */
    update(dt: number): void;
    /** Where the object and the avatar go now, for an avatar and an object of these sizes facing this way. Undefined when nothing is held. */
    pose(avatar: Size, thing: Size, facing: Direction): CarryPose | undefined;
}

const next = { reach: "lift", lift: "show", show: "hold" } as const;
const ease = (k: number) => 1 - (1 - k) * (1 - k);

/**
 * An avatar picking an object up and holding on to it. It knows nothing about pictures: it counts the time and says where the object
 * and the avatar are on each frame (`pose`), so any raster, from any game, can be carried. `T` is whatever the game wants back from `item`.
 */
export function createCarry<T = unknown>({ reach = 0.2, lift = 0.3, show = 0.45, settle = 0.15 }: CarryOptions = {}): Carry<T> {
    const length = { reach, lift, show };
    let phase: CarryPhase = "empty";
    let held: T | undefined;
    let t = 0;
    let from = { x: 0, y: 0 };
    return {
        get phase() {
            return phase;
        },
        get item() {
            return held;
        },
        get busy() {
            return phase === "reach" || phase === "lift" || phase === "show";
        },
        pickUp(item, at) {
            if (phase !== "empty") return false;
            held = item;
            from = at;
            phase = "reach";
            t = 0;
            return true;
        },
        drop() {
            const item = held;
            held = undefined;
            phase = "empty";
            return item;
        },
        update(dt) {
            if (phase === "empty") return;
            t += dt;
            while (phase in next && t >= length[phase as keyof typeof length]) {
                t -= length[phase as keyof typeof length];
                phase = next[phase as keyof typeof next];
            }
            if (phase === "hold") t = Math.min(t, settle);
        },
        pose(avatar, thing, facing) {
            if (phase === "empty") return undefined;
            const middle = Math.round((avatar.width - thing.width) / 2);
            // Carried low in front of the body, held out a little toward where it faces.
            const hold = { x: middle + (facing === "left" ? -4 : facing === "right" ? 4 : 0), y: Math.round(avatar.height * 0.9) - thing.height };
            const over = { x: middle, y: -thing.height - 1 };
            const between = (a: { x: number; y: number }, b: { x: number; y: number }, k: number) => ({ x: Math.round(a.x + (b.x - a.x) * k), y: Math.round(a.y + (b.y - a.y) * k) });
            if (phase === "reach") return { ...from, crouch: Math.round(3 * Math.sin(Math.PI * Math.min(t / reach, 1))), behind: false };
            if (phase === "lift") return { ...between(from, over, ease(t / lift)), crouch: 0, behind: false };
            if (phase === "show") return { ...over, crouch: 0, behind: false };
            const settled = t >= settle;
            return { ...(settled ? hold : between(over, hold, t / settle)), crouch: 0, behind: settled && facing === "up" };
        }
    };
}
