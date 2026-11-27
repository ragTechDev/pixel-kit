import type { Layer, Raster } from "../core/compose";

// The tools the war damage of buildings and objects is made with: a seeded random number generator, a picture that can be cut
// and painted over, and the broken edges, scorching, holes, cracks, rafters and rubble that go on it. Every tone is a fixed one,
// or a colour that is already in the picture darkened toward soot, and everything is a function of a seed, so damage is always
// the same for the same thing. Nothing here takes input.

const SOOT: readonly [number, number, number] = [0x2a, 0x25, 0x23];
export const HOLE = "#1c1816";
export const CHAR = "#2b2523";
export const BEAM = "#4b3527";
export const BEAM_LIT = "#6a4d38";
export const CUT_FACE = "#a89a88";
const SOOT_LEVELS = [0.12, 0.3, 0.5] as const;
export const RUBBLE = ["#5b5651", "#6f6a63", "#47423e", "#7a6a58"] as const;
export const RUBBLE_LIT = "#968f84";

/** A seeded random number generator (mulberry32) from a string. */
export function seeded(text: string): () => number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    let a = h >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function darken(hex: string, amount: number): string {
    const mix = [1, 3, 5].map((i, k) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - amount) + SOOT[k] * amount));
    return `#${mix.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** A picture being damaged: palette indices (0 is transparent) and a palette that can grow. */
export class Canvas {
    readonly px: Uint8Array;
    readonly colors: string[];
    private readonly index = new Map<string, number>();
    constructor(readonly w: number, readonly h: number, raster: Raster) {
        this.px = new Uint8Array(raster.px);
        this.colors = [...raster.colors];
        this.colors.forEach((c, i) => c && this.index.set(c, i));
    }
    on = (x: number, y: number) => x >= 0 && y >= 0 && x < this.w && y < this.h && this.px[y * this.w + x] !== 0;
    clear = (x: number, y: number) => {
        if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = 0;
    };
    private id(color: string): number {
        let i = this.index.get(color);
        if (i === undefined) {
            // A palette index is a byte. If a building ever filled it, the new tone becomes the nearest one it has.
            if (this.colors.length > 255) return this.nearest(color);
            i = this.colors.length;
            this.colors.push(color);
            this.index.set(color, i);
        }
        return i;
    }
    private nearest(color: string): number {
        const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
        const [r, g, b] = rgb(color);
        let best = 1;
        let bestD = Infinity;
        for (let i = 1; i < this.colors.length; i += 1) {
            const [cr, cg, cb] = rgb(this.colors[i]);
            const d = (cr - r) ** 2 + (cg - g) ** 2 + (cb - b) ** 2;
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }
        return best;
    }
    put(x: number, y: number, color: string) {
        if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = this.id(color);
    }
    /** Paints over a pixel that is already there, leaving empty ones empty. */
    over(x: number, y: number, color: string) {
        if (this.on(x, y)) this.put(x, y, color);
    }
    /** Darkens a pixel by the nearest of a few fixed amounts, so a whole building adds only a few tones to its palette. */
    darkenAt(x: number, y: number, amount: number) {
        if (!this.on(x, y)) return;
        const level = SOOT_LEVELS.reduce((best, l) => (Math.abs(l - amount) < Math.abs(best - amount) ? l : best));
        this.put(x, y, darken(this.colors[this.px[y * this.w + x]], level));
    }
    /** The row of the first pixel in a column, or the height when it is empty. */
    top(x: number): number {
        for (let y = 0; y < this.h; y += 1) if (this.on(x, y)) return y;
        return this.h;
    }
}

/** A line that wanders by up to `step` pixels from one column to the next. */
export function walk(rng: () => number, n: number, start: number, step: number, lo: number, hi: number): number[] {
    const out: number[] = [];
    let v = start;
    for (let i = 0; i < n; i += 1) {
        v = Math.min(hi, Math.max(lo, v + Math.round((rng() * 2 - 1) * step)));
        out.push(v);
    }
    return out;
}

/** What `cut` removed: every pixel cut away, and where fire and dust start. */
export interface Breaks {
    readonly sources: [number, number, number][];
    /** Every pixel of the building that was cut away, as a row-major index. */
    readonly opened: Set<number>;
}

/** Removes every pixel above `keep(x)` in the columns from `x0`, `n` of them, and records the break. */
export function cut(c: Canvas, x0: number, keep: number[], breaks: Breaks) {
    keep.forEach((limit, i) => {
        const x = x0 + i;
        let broke = false;
        for (let y = 0; y < Math.min(limit, c.h - 2); y += 1) {
            if (c.on(x, y)) {
                broke = true;
                breaks.opened.add(y * c.w + x);
            }
            c.clear(x, y);
        }
        if (broke) breaks.sources.push([x, limit, 7]);
    });
}

/** A shell hole: dark in the middle, scorched round it. */
export function hole(c: Canvas, rng: () => number, cx: number, cy: number, r: number, breaks: Breaks) {
    for (let y = cy - r - 2; y <= cy + r + 2; y += 1) {
        for (let x = cx - r - 2; x <= cx + r + 2; x += 1) {
            if (!c.on(x, y)) continue;
            const d = Math.hypot(x - cx, (y - cy) * 1.1) + (rng() - 0.5) * 1.6;
            if (d < r) c.put(x, y, HOLE);
            else if (d < r + 1.6) c.put(x, y, CHAR);
        }
    }
    breaks.sources.push([cx, cy, r + 6]);
}

/** A crack running down from (x, y). */
export function crack(c: Canvas, rng: () => number, x: number, y: number, length: number) {
    let cx = x;
    for (let i = 0; i < length; i += 1) {
        c.over(cx, y + i, CHAR);
        if (rng() < 0.45) cx += rng() < 0.5 ? -1 : 1;
        c.over(cx, y + i, CHAR);
    }
}

/** A charred rafter or beam leaning out of a break, over empty space only. */
export function beam(c: Canvas, rng: () => number, x: number, y: number, lean: number, length: number) {
    let bx = x;
    for (let i = 1; i <= length; i += 1) {
        if (i % 2 === 0) bx += lean;
        const by = y - i;
        if (by < 1 || bx < 1 || bx > c.w - 2 || c.on(bx, by)) continue;
        c.put(bx, by, i % 3 === 0 ? BEAM_LIT : BEAM);
    }
    void rng;
}

/** A heap of rubble standing on the ground row from `x0`, with a height for each column, and a few stones beyond its ends. */
export function heap(c: Canvas, rng: () => number, x0: number, heights: number[]) {
    heights.forEach((height, i) => {
        const x = x0 + i;
        if (x < 1 || x > c.w - 2) return;
        for (let k = 0; k < height; k += 1) {
            const y = c.h - 1 - k;
            c.put(x, y, k === height - 1 && rng() < 0.7 ? RUBBLE_LIT : RUBBLE[Math.floor(rng() * RUBBLE.length)]);
        }
    });
}

/** Heights for a low mound `n` columns wide: never steeper than a heap of stones can lie. */
export function bell(n: number, peak: number, rng: () => number): number[] {
    const top = Math.max(2, Math.min(peak, n * 0.3));
    let jitter = 0;
    return Array.from({ length: n }, (_, i) => {
        jitter = Math.max(-1, Math.min(1, jitter + (rng() < 0.5 ? -1 : 1) * (rng() < 0.4 ? 1 : 0)));
        return Math.max(1, Math.round(top * Math.sin((Math.PI * (i + 0.5)) / n) + jitter));
    });
}

/**
 * Breaks the straight lines a cut leaves: for a few passes, a pixel of the building beside the opening may fall away too, so
 * the edge gets teeth and notches. `passes` is the chance of falling in each pass, and a small thing wants fewer and gentler ones. The bottom rows stay, so the building still stands on its ground line.
 */
export function ragged(c: Canvas, rng: () => number, opened: Set<number>, passes: readonly number[] = [0.5, 0.35, 0.2]) {
    for (const p of passes) {
        const fall: number[] = [];
        for (let y = 1; y < c.h - 3; y += 1) {
            for (let x = 1; x < c.w - 1; x += 1) {
                if (!c.on(x, y)) continue;
                const k = y * c.w + x;
                if ((opened.has(k - 1) || opened.has(k + 1) || opened.has(k - c.w) || opened.has(k + c.w)) && rng() < p) fall.push(k);
            }
        }
        for (const k of fall) {
            c.clear(k % c.w, Math.floor(k / c.w));
            opened.add(k);
        }
    }
}

/**
 * Gives every break its thickness, like the edge of a roof: where the building's wall or roof is open above, its torn top is
 * a light face over a dark underside, and where it is open to the side, a dark line.
 */
export function edges(c: Canvas, opened: Set<number>) {
    const faces: [number, number, string][] = [];
    for (let y = 1; y < c.h - 2; y += 1) {
        for (let x = 0; x < c.w; x += 1) {
            const k = y * c.w + x;
            if (!c.on(x, y) || opened.has(k)) continue;
            if (opened.has(k - c.w)) {
                faces.push([x, y, CUT_FACE]);
                if (!opened.has(k + c.w)) faces.push([x, y + 1, CHAR]);
            } else if ((x > 0 && opened.has(k - 1)) || (x < c.w - 1 && opened.has(k + 1))) faces.push([x, y, CHAR]);
        }
    }
    for (const [x, y, color] of faces) c.over(x, y, color);
}

/** Blackens the broken edges and the ground round every fire. A lit pixel is a shade darker the closer it is. */
export function scorch(c: Canvas, rng: () => number, breaks: Breaks, whole: number) {
    const done = new Set<number>();
    for (const [sx, sy, reach] of breaks.sources) {
        for (let y = Math.max(0, sy - reach); y <= Math.min(c.h - 1, sy + reach); y += 1) {
            for (let x = Math.max(0, sx - reach); x <= Math.min(c.w - 1, sx + reach); x += 1) {
                const key = y * c.w + x;
                if (done.has(key) || !c.on(x, y)) continue;
                const d = Math.hypot(x - sx, y - sy);
                if (d > reach || rng() > 0.9 - d / (reach * 1.6)) continue;
                done.add(key);
                c.darkenAt(x, y, 0.55 - (d / reach) * 0.3);
            }
        }
    }
    if (whole > 0) {
        for (let y = 0; y < c.h; y += 1) for (let x = 0; x < c.w; x += 1) if (!done.has(y * c.w + x)) c.darkenAt(x, y, whole);
    }
}

/** A finished picture as the one layer of a thing, so a damaged building or object takes the place of the layers it was drawn from. */
export function rasterLayer(raster: Raster): Layer {
    return { sprite: { width: raster.width, height: raster.height, originX: 0, originY: 0, px: raster.px }, slots: raster.colors, x: 0, y: 0 };
}
