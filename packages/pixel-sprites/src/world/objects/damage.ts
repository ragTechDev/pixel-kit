import type { Raster } from "../../core/compose";
import { Canvas, HOLE, bell, crack, cut, edges, heap, hole, ragged, scorch, seeded, walk, type Breaks } from "../damageTools";
import type { ObjectId } from "../types";
import { objectRamps } from "./ramps";

// War damage for an object. Like a building's it is a pass over the finished picture, seeded from the object's key, so an
// object is always damaged the same way and keeps its own colours (and its season's). What is lost depends on the object: a
// tree is blasted and then burnt down to a trunk, a window loses its glass, a bookshelf its books, a rug is burnt through
// in holes. Every tone is a fixed one or the object's own colour darkened toward soot, and nothing here takes input.

/** How badly an object is damaged: `none` is untouched, `half` is broken in one place, and `ruin` is most of the way gone. */
export const objectDamage = ["none", "half", "ruin"] as const;
export type ObjectDamage = (typeof objectDamage)[number];

type Level = Exclude<ObjectDamage, "none">;

const glassTones = new Set<string>(Object.values(objectRamps.glass));
const bookTones = new Set<string>([objectRamps.book_blue, objectRamps.book_red, objectRamps.book_green].flatMap((r) => Object.values(r)));
const BOOKS = [objectRamps.book_blue.base, objectRamps.book_red.base, objectRamps.book_green.base, objectRamps.book_blue.highlight, objectRamps.book_red.highlight];

/** The columns that have something in them. */
function span(c: Canvas): [number, number] {
    let x0 = c.w;
    let x1 = -1;
    for (let x = 0; x < c.w; x += 1) {
        if (c.top(x) < c.h) {
            x0 = Math.min(x0, x);
            x1 = x;
        }
    }
    return [x0, x1];
}

/** A bite out of the top, `width` columns from `x0` and up to `depth` deep in the middle. */
function bite(c: Canvas, rng: () => number, breaks: Breaks, x0: number, width: number, depth: number) {
    const wobble = walk(rng, width, 0, 1.2, -2, 2);
    cut(c, x0, Array.from({ length: width }, (_, i) => c.top(x0 + i) + Math.max(1, Math.round(depth * Math.sin((Math.PI * (i + 0.5)) / width) + wobble[i]))), breaks);
}

/** Everything but a broken stub `remain` pixels high, in the columns from `from` to `to` (the object's own width by default). */
function stub(c: Canvas, rng: () => number, breaks: Breaks, remain: number, from?: number, to?: number) {
    const [a, b] = span(c);
    const x0 = from ?? a;
    const x1 = to ?? b;
    cut(c, x0, walk(rng, x1 - x0 + 1, c.h - remain, 2, c.h - remain - 3, c.h - remain + 3), breaks);
}

/** Clears a rectangle of the object. */
function gap(c: Canvas, breaks: Breaks, x0: number, y0: number, x1: number, y1: number) {
    for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) {
            if (!c.on(x, y)) continue;
            breaks.opened.add(y * c.w + x);
            c.clear(x, y);
        }
    }
}

/** A hole burnt through the object, scorched at its rim. */
function burn(c: Canvas, rng: () => number, breaks: Breaks, cx: number, cy: number, r: number) {
    for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y += 1) {
        for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x += 1) {
            if (!c.on(x, y)) continue;
            const d = Math.hypot(x - cx, y - cy) + (rng() - 0.5) * 1.8;
            if (d < r) {
                breaks.opened.add(y * c.w + x);
                c.clear(x, y);
            } else if (d < r + 1.4) c.darkenAt(x, y, 0.5);
        }
    }
    breaks.sources.push([Math.round(cx), Math.round(cy), Math.round(r + 4)]);
}

/** Darkens the pixels of a region to the soot of a fire, most of them. */
function char(c: Canvas, rng: () => number, amount: number, inside: (x: number, y: number) => boolean) {
    for (let y = 0; y < c.h; y += 1) for (let x = 0; x < c.w; x += 1) if (inside(x, y) && rng() < 0.8) c.darkenAt(x, y, amount);
}

/** Puts a dark void in place of every pixel of the tones, in the rows from `y0` to `y1`: what is behind a window pane or a shelf. */
function empty(c: Canvas, rng: () => number, tones: Set<string>, chance: number, y0 = 0, y1 = c.h) {
    for (let y = y0; y < y1; y += 1) {
        for (let x = 0; x < c.w; x += 1) if (c.on(x, y) && tones.has(c.colors[c.px[y * c.w + x]]) && rng() < chance) c.put(x, y, HOLE);
    }
}

/** A few books and planks fallen at the foot of something. */
function spill(c: Canvas, rng: () => number, x0: number, n: number, books = false) {
    if (!books) {
        heap(c, rng, x0, bell(n, 3, rng));
        return;
    }
    for (let i = 0; i < n; i += 1) {
        const x = x0 + Math.floor(rng() * (n * 2));
        const y = c.h - 1 - Math.floor(rng() * 2);
        for (let k = 0; k < 3; k += 1) c.put(x + k, y, BOOKS[Math.floor(rng() * BOOKS.length)]);
    }
}

type Recipe = (c: Canvas, rng: () => number, breaks: Breaks, level: Level) => number;

const half = (level: Level) => level === "half";

const recipes: Record<ObjectId, Recipe> = {
    // Blasted: a chunk of the canopy is gone, the rest is scorched and holed. A ruin is a burnt trunk, broken off short.
    tree: (c, rng, breaks, level) => {
        if (half(level)) {
            const side = rng() < 0.5;
            bite(c, rng, breaks, side ? 1 : Math.round(c.w * 0.5), Math.round(c.w * 0.45), 7 + Math.floor(rng() * 3));
            for (let i = 0; i < 2; i += 1) burn(c, rng, breaks, 4 + rng() * 8, 5 + rng() * 8, 1.2 + rng() * 0.8);
            char(c, rng, 0.45, (_x, y) => y < 16);
            crack(c, rng, 8, 20, 6);
            return 0.12;
        }
        stub(c, rng, breaks, 12 + Math.floor(rng() * 4));
        spill(c, rng, 3, 10);
        return 0.5;
    },
    // Planks gone from the middle and a post broken; a ruin is two stumps and the planks in the dirt.
    fence: (c, rng, breaks, level) => {
        const gx = 5 + Math.floor(rng() * 4);
        gap(c, breaks, gx, 2, gx + 1 + (half(level) ? 0 : Math.floor(rng() * 3)), c.h - 3);
        if (half(level)) {
            bite(c, rng, breaks, rng() < 0.5 ? 1 : 10, 5, 3);
            return 0.12;
        }
        stub(c, rng, breaks, 6);
        spill(c, rng, 2, 12);
        return 0.4;
    },
    // Split and scorched, with a hole through it; a ruin is the foot of a doorframe.
    door: (c, rng, breaks, level) => {
        if (half(level)) {
            bite(c, rng, breaks, rng() < 0.5 ? 2 : 8, 7, 5);
            for (let i = 0; i < 2; i += 1) hole(c, rng, 5 + Math.floor(rng() * 6), 6 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 2), breaks);
            crack(c, rng, 5 + Math.floor(rng() * 5), 2, 9);
            return 0.12;
        }
        stub(c, rng, breaks, 5);
        spill(c, rng, 3, 10);
        return 0.4;
    },
    // Shattered: shards of glass left in a cracked frame; a ruin is an empty, broken frame.
    window: (c, rng, breaks, level) => {
        if (half(level)) {
            empty(c, rng, glassTones, 0.55);
            crack(c, rng, 6 + Math.floor(rng() * 4), 4, 8);
            bite(c, rng, breaks, rng() < 0.5 ? 2 : 8, 6, 3);
            return 0.12;
        }
        empty(c, rng, glassTones, 1);
        bite(c, rng, breaks, 2, 12, 5);
        spill(c, rng, 3, 8);
        return 0.4;
    },
    // Chipped, cracked and holed along one end; a ruin has fallen in on one side.
    counter: (c, rng, breaks, level) => {
        if (half(level)) {
            bite(c, rng, breaks, rng() < 0.5 ? 1 : 18, 12, 4);
            hole(c, rng, 8 + Math.floor(rng() * 14), 9, 1 + Math.floor(rng() * 2), breaks);
            crack(c, rng, 8 + Math.floor(rng() * 14), 3, 8);
            return 0.12;
        }
        const left = rng() < 0.5;
        stub(c, rng, breaks, 5, left ? 1 : 16, left ? 15 : 30);
        bite(c, rng, breaks, left ? 16 : 1, 14, 6);
        spill(c, rng, left ? 2 : 14, 14);
        return 0.4;
    },
    // Books gone from a shelf and a corner broken; a ruin is a low heap of planks and the books on the floor.
    bookshelf: (c, rng, breaks, level) => {
        if (half(level)) {
            bite(c, rng, breaks, rng() < 0.5 ? 1 : 7, 9, 8);
            const band = 3 + Math.floor(rng() * 18);
            empty(c, rng, bookTones, 1, band, band + 8);
            spill(c, rng, 2, 4, true);
            return 0.12;
        }
        stub(c, rng, breaks, 9 + Math.floor(rng() * 3));
        spill(c, rng, 1, 12);
        spill(c, rng, 2, 6, true);
        return 0.4;
    },
    // Burnt through in holes with scorched, ragged edges.
    rug: (c, rng, breaks, level) => {
        for (let i = half(level) ? 3 : 7; i > 0; i -= 1) burn(c, rng, breaks, 4 + rng() * 24, 4 + rng() * 24, 3 + rng() * 3);
        return half(level) ? 0.15 : 0.35;
    },
    // Burnt: charred, with parts of it gone.
    flower: (c, rng, breaks, level) => {
        for (let i = half(level) ? 2 : 4; i > 0; i -= 1) burn(c, rng, breaks, 3 + rng() * 10, 3 + rng() * 10, 2 + rng());
        return half(level) ? 0.3 : 0.55;
    }
};

/** The ground objects scorch where they are, with no broken top, so they get no edges of lit stone. */
const ground = new Set<ObjectId>(["rug", "flower"]);

/**
 * Returns the object's picture, damaged. `key` is the object's cache key, which seeds every choice, and `raster` is the object
 * drawn undamaged. The bottom rows are never cleared, so the object still stands where it did, and its footprint does not change.
 */
export function damageObjectRaster(id: ObjectId, raster: Raster, level: Level, key: string): Raster {
    const c = new Canvas(raster.width, raster.height, raster);
    const rng = seeded(`${level}|${key}`);
    const breaks: Breaks = { sources: [], opened: new Set() };
    const whole = recipes[id](c, rng, breaks, level);
    ragged(c, rng, breaks.opened, ground.has(id) ? [0.2] : [0.3, 0.12]);
    if (!ground.has(id)) edges(c, breaks.opened);
    scorch(c, rng, breaks, whole);
    return { width: raster.width, height: raster.height, colors: c.colors, px: c.px };
}
