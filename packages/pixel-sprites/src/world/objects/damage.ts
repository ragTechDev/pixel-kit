import type { Raster } from "../../core/compose";
import { Canvas, HOLE, bell, crack, cut, edges, heap, hole, ragged, scorch, seeded, walk, type Breaks } from "../damageTools";
import type { CropId, FruitId, ObjectId, VegId } from "../types";
import { fruitIds } from "./fruitTree";
import { cropIds, vegIds } from "./vegetables";
import { objectRamps } from "./ramps";

// War damage for an object. Like a building's it is a pass over the finished picture, seeded from the object's key, so an
// object is always damaged the same way and keeps its own colours (and its season's). What is lost depends on the object: a
// tree is blasted down to its branches and then burnt to a trunk, a window loses its glass, a bookshelf its books, a rug is burnt through
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

/** The limbs of a tree, from the top of the trunk outward: one to the left, one up and one to the right. */
const limbs: readonly (readonly (readonly [number, number])[])[] = [
    [[7, 13], [6, 12], [5, 11], [4, 10], [3, 9], [3, 8], [2, 7]],
    [[7, 13], [7, 12], [8, 11], [8, 10], [8, 9], [8, 8], [8, 7], [8, 6]],
    [[8, 13], [9, 12], [10, 11], [11, 10], [12, 9], [12, 8], [13, 7]]
];

/**
 * Turns a tree into its bones: the canopy is cleared away, except for a clump or two of leaves round the tips of limbs that
 * keep them, so every leaf that is left is on a branch, and the branches that lost theirs are bare. The limbs are drawn over
 * what is left, in the bark's own colours, with a twig or two off them.
 */
function skeleton(c: Canvas, rng: () => number) {
    const order = [0, 1, 2].sort(() => rng() - 0.5);
    const kept = order.slice(0, rng() < 0.5 ? 1 : 2).map((i) => limbs[i]);
    const near = (x: number, y: number) => kept.some((limb) => limb.slice(2).some(([lx, ly]) => Math.hypot(x - lx, y - ly) <= 3.4 + (rng() - 0.5)));
    for (let y = 0; y <= 12; y += 1) for (let x = 0; x < c.w; x += 1) if (c.on(x, y) && !near(x, y)) c.clear(x, y);
    // The foot of the canopy, where it wrapped round the top of the trunk, is gone wherever it stuck out past it.
    for (let y = 13; y <= 16; y += 1) for (let x = 0; x < c.w; x += 1) if (x < 4 || x > 11) c.clear(x, y);
    const bark = objectRamps.bark;
    const draw = (x: number, y: number) => {
        c.put(x, y, bark.base);
        c.put(x + 1, y, bark.shadow);
    };
    for (const limb of limbs) {
        limb.forEach(([x, y], i) => {
            draw(x, y);
            // A twig off every other pixel of the limb's outer half, leaning away from the middle.
            if (i >= 3 && i % 2 === 1 && rng() < 0.8) {
                const away = x < 7 ? -1 : 1;
                draw(x + away, y - 1);
                if (rng() < 0.5) draw(x + away * 2, y - 2);
            }
        });
    }
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

// Blasted: the canopy is blown away down to the branches, with a clump of scorched leaves left on one or two of them. A ruin
// is a burnt trunk, broken off short.
const treeRecipe: Recipe = (c, rng, breaks, level) => {
    if (half(level)) {
        skeleton(c, rng);
        // The leaves that are left are scorched. The bark, branches and trunk are left to the soot over the whole tree.
        const bark = new Set<string>(Object.values(objectRamps.bark));
        char(c, rng, 0.4, (x, y) => y < 17 && c.on(x, y) && !bark.has(c.colors[c.px[y * c.w + x]]));
        crack(c, rng, 8, 20, 6);
        return 0.12;
    }
    stub(c, rng, breaks, 12 + Math.floor(rng() * 4));
    spill(c, rng, 3, 10);
    return 0.5;
};

const barkTones = new Set<string>([...Object.values(objectRamps.bark), ...Object.values(objectRamps.bark_olive)]);

/** A fruit tree, at any size: the same, found from the picture. Limbs are drawn from the top of the trunk to a few tips, and leaves stay only round some of them. */
const fruitTreeRecipe: Recipe = (c, rng, breaks, level) => {
    const isBark = (x: number, y: number) => c.on(x, y) && barkTones.has(c.colors[c.px[y * c.w + x]]);
    let top = c.h;
    for (let y = 0; y < c.h && top === c.h; y += 1) for (let x = 0; x < c.w; x += 1) if (isBark(x, y)) top = y;
    const [x0, x1] = span(c);
    const cx = Math.round((x0 + x1) / 2);
    if (half(level) && top > 8) {
        const tips = [0, 1, 2].map((i) => [cx + (i - 1) * Math.round((x1 - x0) * (0.2 + rng() * 0.15)), top - Math.round((0.35 + rng() * 0.5) * top)] as const);
        const kept = tips.sort(() => rng() - 0.5).slice(0, rng() < 0.5 ? 1 : 2);
        const base = top + 2;
        // Whatever of the crown covers the top of the trunk goes with it, and the trunk's broken top is filled in where the crown hid it.
        for (let y = 0; y <= base; y += 1) for (let x = 0; x < c.w; x += 1) if (c.on(x, y) && !isBark(x, y) && !kept.some(([tx, ty]) => Math.hypot(x - tx, y - ty) <= 5.5 + (rng() - 0.5))) c.clear(x, y);
        const bark = objectRamps.bark;
        for (let y = top; y <= base; y += 1) {
            const xs = Array.from({ length: c.w }, (_, x) => x).filter((x) => isBark(x, y));
            for (let x = xs[0]; x <= xs[xs.length - 1]; x += 1) if (xs.length) c.put(x, y, bark.base);
        }
        for (const [tx, ty] of tips) {
            const steps = Math.max(Math.abs(tx - cx), base - ty);
            for (let i = 0; i <= steps; i += 1) {
                const x = Math.round(cx + ((tx - cx) * i) / steps);
                const y = Math.round(base - ((base - ty) * i) / steps);
                c.put(x, y, bark.base);
                c.put(x + 1, y, bark.shadow);
            }
        }
        char(c, rng, 0.4, (x, y) => y < top + 2 && c.on(x, y) && !barkTones.has(c.colors[c.px[y * c.w + x]]));
        crack(c, rng, cx - 2, c.h - 10, 6);
        return 0.12;
    }
    stub(c, rng, breaks, 10 + Math.floor(rng() * 4));
    spill(c, rng, cx - 8, 10);
    return 0.5;
};

/** Fruit and vegetables, picked or in a field: a bite or two out of something small, and most of it gone in a ruin. */
const smallRecipe: Recipe = (c, rng, breaks, level) => {
    const filled: [number, number][] = [];
    for (let y = 0; y < c.h; y += 1) for (let x = 0; x < c.w; x += 1) if (c.on(x, y)) filled.push([x, y]);
    for (let i = half(level) ? 1 : 3; i > 0; i -= 1) {
        const [x, y] = filled[Math.floor(rng() * filled.length)];
        burn(c, rng, breaks, x, y, half(level) ? 1.5 : 2.6);
    }
    return half(level) ? 0.3 : 0.55;
};

const recipes: Record<ObjectId, Recipe> = {
    tree: treeRecipe,
    fruit_tree: fruitTreeRecipe,
    ...(Object.fromEntries(fruitIds.map((id) => [id, smallRecipe])) as unknown as Record<FruitId, Recipe>),
    ...(Object.fromEntries(cropIds.map((id) => [id, smallRecipe])) as unknown as Record<CropId, Recipe>),
    ...(Object.fromEntries(vegIds.map((id) => [id, smallRecipe])) as unknown as Record<VegId, Recipe>),
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

/**
 * Takes away anything that is no longer joined to the object's foot, as a leaf, a plank or a pane left hanging in the air
 * would be: only what is touching the lowest rows of the object, or touching something that does, is kept.
 */
function keepConnected(c: Canvas, root: number) {
    const seen = new Uint8Array(c.w * c.h);
    const queue: number[] = [];
    for (let y = Math.max(0, root); y < c.h; y += 1) {
        for (let x = 0; x < c.w; x += 1) {
            if (c.on(x, y)) {
                seen[y * c.w + x] = 1;
                queue.push(y * c.w + x);
            }
        }
    }
    for (let head = 0; head < queue.length; head += 1) {
        const x = queue[head] % c.w;
        const y = Math.floor(queue[head] / c.w);
        for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
                const k = (y + dy) * c.w + x + dx;
                if (x + dx >= 0 && x + dx < c.w && c.on(x + dx, y + dy) && !seen[k]) {
                    seen[k] = 1;
                    queue.push(k);
                }
            }
        }
    }
    for (let k = 0; k < seen.length; k += 1) if (!seen[k]) c.clear(k % c.w, Math.floor(k / c.w));
}

/** What is already shaped as it should be, and wants no teeth or torn faces added: a damaged tree is bare branches and clumps of leaves. */
const plain = (id: ObjectId, level: Level) => (id === "tree" || id === "fruit_tree") && level === "half";

/** The ground objects scorch where they are, with no broken top, so they get no edges of lit stone. */
const ground = new Set<ObjectId>(["rug", "flower", ...fruitIds, ...vegIds]);

/**
 * Returns the object's picture, damaged. `key` is the object's cache key, which seeds every choice, and `raster` is the object
 * drawn undamaged. The bottom rows are never cleared, so the object still stands where it did, and its footprint does not change.
 */
export function damageObjectRaster(id: ObjectId, raster: Raster, level: Level, key: string): Raster {
    const c = new Canvas(raster.width, raster.height, raster);
    const rng = seeded(`${level}|${key}`);
    const breaks: Breaks = { sources: [], opened: new Set() };
    const whole = recipes[id](c, rng, breaks, level);
    if (!plain(id, level)) ragged(c, rng, breaks.opened, ground.has(id) ? [0.2] : [0.3, 0.12]);
    if (!ground.has(id)) {
        let bottom = raster.height - 1;
        while (bottom > 0 && raster.px.slice(bottom * raster.width, (bottom + 1) * raster.width).every((i) => i === 0)) bottom -= 1;
        keepConnected(c, bottom - 2);
    }
    if (!ground.has(id) && !plain(id, level)) edges(c, breaks.opened);
    scorch(c, rng, breaks, whole);
    return { width: raster.width, height: raster.height, colors: c.colors, px: c.px };
}
