import type { Size } from "./camera";

/** A rectangle in world pixels. */
export interface Rect {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

/** What a popup sits on: a rectangle, or a function that gives it each frame, for something that moves. */
export type Anchor = Rect | (() => Rect);

export interface PopupOptions {
    /** Seconds a popup stays. Default 1.2. */
    duration?: number;
    /** Pixels it floats up while it stays. Default 4. */
    rise?: number;
    /** Pixels between the top of what it sits on and the bottom of it. Default 1. */
    gap?: number;
    /** Seconds it takes to fade out at the end. Default 0.25. */
    fade?: number;
}

/** Where to draw one popup now. `item` is whatever the game gave it. */
export interface Popup<T> {
    readonly item: T;
    /** Top-left in world pixels, whole numbers. */
    readonly x: number;
    readonly y: number;
    /** 1 while it shows, falling to 0 as it fades out. */
    readonly alpha: number;
}

export interface Popups<T> {
    /** The popups showing now, oldest first, so a newer one is drawn over an older one. */
    readonly active: readonly Popup<T>[];
    /**
     * Shows `item`, `size` pixels big, centred above `anchor`. A popup with the same `key` is replaced, so pressing a button again restarts
     * one instead of stacking another.
     */
    show(item: T, anchor: Anchor, size: Size, key?: unknown): void;
    /** Moves every popup on by `dt` seconds and removes the ones that are done. */
    update(dt: number): void;
    /** Removes them all. */
    clear(): void;
}

interface Entry<T> {
    item: T;
    anchor: Anchor;
    size: Size;
    key: unknown;
    age: number;
}

/**
 * Pictures that appear on top of something else for a moment: a heart over a character, a mark over a door. It draws nothing and takes any
 * kind of item (an icon, an object, an avatar), so what appears, and on what, is up to the game. A popup follows its anchor if that is a
 * function, floats up a little and fades out. `T` is whatever the game wants back in `active`.
 */
export function createPopups<T = unknown>({ duration = 1.2, rise = 4, gap = 1, fade = 0.25 }: PopupOptions = {}): Popups<T> {
    let entries: Entry<T>[] = [];
    return {
        get active() {
            return entries.map(({ item, anchor, size, age }) => {
                const target = typeof anchor === "function" ? anchor() : anchor;
                // Floats up quickly, then slows, so it settles rather than drifts.
                const lift = rise * (1 - (1 - Math.min(age / duration, 1)) ** 2);
                return {
                    item,
                    x: Math.round(target.x + (target.width - size.width) / 2),
                    y: Math.round(target.y - size.height - gap - lift),
                    alpha: Math.min(1, Math.max(0, (duration - age) / fade))
                };
            });
        },
        show(item, anchor, size, key) {
            if (key !== undefined) entries = entries.filter((e) => e.key !== key);
            entries.push({ item, anchor, size, key, age: 0 });
        },
        update(dt) {
            entries = entries.filter((e) => (e.age += dt) < duration);
        },
        clear() {
            entries = [];
        }
    };
}
