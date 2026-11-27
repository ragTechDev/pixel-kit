import type { Layer, Raster } from "../../core/compose";

// War damage for a building. It is a pass over the finished picture, so it works on every roof, wall and wing the same way
// and keeps the building's own colours: it cuts the silhouette (a bite out of the roof, a collapsed corner, a broken wall
// top) and shows the rooms it opens (a back wall, floorboards, a joist between storeys and a few pieces of furniture),
// blackens the broken edges and the area round them, opens shell holes and cracks, leans a few charred rafters on the
// breaks and heaps rubble at the foot. Everything is a function of the building's key, so a building is always damaged the
// same way, and every tone is a fixed one or the building's own colour darkened toward soot. Nothing here takes input.

/** How badly a building is damaged: `none` is untouched, `half` has lost a corner and a part of its roof, and `ruin` is a broken shell. */
export const buildingDamage = ["none", "half", "ruin"] as const;
export type BuildingDamage = (typeof buildingDamage)[number];

const SOOT: readonly [number, number, number] = [0x2a, 0x25, 0x23];
const HOLE = "#1c1816";
const CHAR = "#2b2523";
const BEAM = "#4b3527";
const BEAM_LIT = "#6a4d38";
const SOOT_LEVELS = [0.12, 0.3, 0.5] as const;
const BACK = "#6b5848";
const STRIPE = "#7a6652";
const SIDE = "#3a2f2a";
const TOP_LIT = "#8a7662";
const CUT_FACE = "#a89a88";
const SHADE = ["#463a30", "#52443a"] as const;
const PLANK = "#76563a";
const PLANK_DARK = "#5c432d";
const FURNITURE: Record<string, string> = { B: "#4b3527", b: "#6a4d38", c: "#b9a98b", r: "#8a3b32", g: "#4d6b4a", y: "#c9a85c", w: "#7c8a96" };
/** The furniture a room shows, as rows of tones (a space is empty), standing on the floor. */
const BED = ["BB............", "BBccwwwwwwwwww", "BBccwwwwwwwwww", "bbbbbbbbbbbbbb", "B............B", "B............B"];
const SHELF = ["BBBBBBBB", "BrgyrcgB", "BrgyrcgB", "BBBBBBBB", "BcrgyrgB", "BcrgyrgB", "BBBBBBBB", "BgyrcrgB", "BgyrcrgB", "BBBBBBBB"];
const TABLE = ["bbbbbbbbbbbb", "BBBBBBBBBBBB", " B        B ", " B        B ", " B        B ", " B        B ", " B        B "];
const CHAIR = ["B    ", "B    ", "B    ", "BBBB ", "B  B ", "B  B ", "B  B "];
const FRAME = ["BBBBBBB", "BwwwwwB", "BwgggwB", "BwwgwwB", "BwwwwwB", "BBBBBBB"];
const PIECES = [BED, SHELF, TABLE, CHAIR, SHELF, TABLE, CHAIR];
const RUBBLE = ["#5b5651", "#6f6a63", "#47423e", "#7a6a58"] as const;
const RUBBLE_LIT = "#968f84";

/** A seeded random number generator (mulberry32) from a string. */
function seeded(text: string): () => number {
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

function darken(hex: string, amount: number): string {
    const mix = [1, 3, 5].map((i, k) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - amount) + SOOT[k] * amount));
    return `#${mix.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** A picture being damaged: palette indices (0 is transparent) and a palette that can grow. */
class Canvas {
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
function walk(rng: () => number, n: number, start: number, step: number, lo: number, hi: number): number[] {
    const out: number[] = [];
    let v = start;
    for (let i = 0; i < n; i += 1) {
        v = Math.min(hi, Math.max(lo, v + Math.round((rng() * 2 - 1) * step)));
        out.push(v);
    }
    return out;
}

/** What `cut` removed: every pixel cut away, and where fire and dust start. */
interface Breaks {
    readonly sources: [number, number, number][];
    /** Every pixel of the building that was cut away, as a row-major index. */
    readonly opened: Set<number>;
}

/** Removes every pixel above `keep(x)` in the columns from `x0`, `n` of them, and records the break. */
function cut(c: Canvas, x0: number, keep: number[], breaks: Breaks) {
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
function hole(c: Canvas, rng: () => number, cx: number, cy: number, r: number, breaks: Breaks) {
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
function crack(c: Canvas, rng: () => number, x: number, y: number, length: number) {
    let cx = x;
    for (let i = 0; i < length; i += 1) {
        c.over(cx, y + i, CHAR);
        if (rng() < 0.45) cx += rng() < 0.5 ? -1 : 1;
        c.over(cx, y + i, CHAR);
    }
}

/** A charred rafter or beam leaning out of a break, over empty space only. */
function beam(c: Canvas, rng: () => number, x: number, y: number, lean: number, length: number) {
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
function heap(c: Canvas, rng: () => number, x0: number, heights: number[]) {
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
function bell(n: number, peak: number, rng: () => number): number[] {
    const top = Math.max(2, Math.min(peak, n * 0.3));
    let jitter = 0;
    return Array.from({ length: n }, (_, i) => {
        jitter = Math.max(-1, Math.min(1, jitter + (rng() < 0.5 ? -1 : 1) * (rng() < 0.4 ? 1 : 0)));
        return Math.max(1, Math.round(top * Math.sin((Math.PI * (i + 0.5)) / n) + jitter));
    });
}

/**
 * Breaks the straight lines a cut leaves: for a few passes, a pixel of the building beside the opening may fall away too, so
 * the edge gets teeth and notches. The bottom rows stay, so the building still stands on its ground line.
 */
function ragged(c: Canvas, rng: () => number, opened: Set<number>) {
    for (const p of [0.5, 0.35, 0.2]) {
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
function edges(c: Canvas, opened: Set<number>) {
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

/** A room of the building, in pixels of the whole picture: the span of its wall, where it starts under the roof and the line of each floor (the lowest storey's is last). */
export interface Room {
    readonly x0: number;
    readonly x1: number;
    readonly top: number;
    readonly floors: readonly number[];
}

/**
 * Shows the rooms the cuts opened. The part of each room that was cut away gets a back wall (which stands to a ragged height,
 * and in a ruin is half gone), floorboards, a joist under each upper floor and some furniture. The furniture is drawn only
 * where the back wall shows, so what the broken wall still hides stays hidden.
 */
/**
 * Gives the open room its edges. The room's outline is roughened (a pixel that borders empty air may fall away), a pixel with
 * air to its side is dark, as the thickness of the wall that has broken away, the top of the back wall is in shadow under
 * the ceiling it lost, and above it is what is left of that ceiling: boards and a few rafter ends, ragged and a little thicker
 * in places, so the torn top has depth like the roof's edge.
 */
function shape(c: Canvas, rng: () => number, visible: Set<number>) {
    const air = (x: number, y: number) => x < 0 || x >= c.w || y < 0 || !c.on(x, y);
    for (const p of [0.4, 0.25]) {
        const gone: number[] = [];
        for (const k of visible) {
            const x = k % c.w;
            const y = Math.floor(k / c.w);
            if ((air(x - 1, y) || air(x + 1, y)) && rng() < p) gone.push(k);
            else if (air(x, y - 1) && rng() < p / 3) gone.push(k);
        }
        for (const k of gone) {
            c.clear(k % c.w, Math.floor(k / c.w));
            visible.delete(k);
        }
    }
    const topOf = new Map<number, number>();
    for (const k of visible) {
        const x = k % c.w;
        const y = Math.floor(k / c.w);
        if (air(x - 1, y) || air(x + 1, y)) c.put(x, y, SIDE);
        topOf.set(x, Math.min(topOf.get(x) ?? y, y));
    }
    // Bare patches where the plaster has come away from the back wall.
    for (let n = Math.floor(visible.size / 140); n > 0; n -= 1) {
        const keys = [...visible];
        const k = keys[Math.floor(rng() * keys.length)];
        const cx = k % c.w;
        const cy = Math.floor(k / c.w);
        const r = 2 + rng() * 2.5;
        for (let y = Math.floor(cy - r); y <= cy + r; y += 1) {
            for (let x = Math.floor(cx - r * 1.4); x <= cx + r * 1.4; x += 1) {
                if (visible.has(y * c.w + x) && c.px[y * c.w + x] !== 0 && Math.hypot((x - cx) / 1.4, y - cy) + (rng() - 0.5) < r) c.put(x, y, SHADE[1]);
            }
        }
    }
    // The ceiling: a slab a few pixels thick that changes thickness slowly, lit along its top and with the odd rafter end through it.
    const thick = walk(rng, c.w, 3, 1, 2, 4);
    for (const [x, top] of topOf) {
        for (let d = 0; d < 2; d += 1) c.over(x, top + d, SHADE[d]);
        const t = thick[x];
        for (let d = 1; d <= t; d += 1) if (!c.on(x, top - d) && top - d > 0) c.put(x, top - d, d === t ? TOP_LIT : BEAM);
        if (x % 9 === 2 && t >= 3) for (let d = t + 1; d <= t + 2; d += 1) if (!c.on(x, top - d) && top - d > 0) c.put(x, top - d, BEAM_LIT);
    }
}

function interior(c: Canvas, rng: () => number, rooms: readonly Room[], opened: Set<number>, ruined: boolean) {
    const backs = new Map<Room, number[]>();
    for (const room of rooms) {
        const span = room.floors[room.floors.length - 1] - room.top;
        const n = room.x1 - room.x0;
        backs.set(room, ruined ? walk(rng, n, room.top + span * (0.3 + rng() * 0.15), 2.2, room.top + span * 0.2, room.top + span * 0.6) : walk(rng, n, room.top + 3, 2, room.top - 1, room.top + 9));
    }
    const visible = new Set<number>();
    for (const key of opened) {
        const x = key % c.w;
        const y = Math.floor(key / c.w);
        const room = rooms.find((r) => x >= r.x0 && x < r.x1 && y >= r.top && y <= r.floors[r.floors.length - 1] + 3);
        if (!room) continue;
        const back = Math.round(backs.get(room)![x - room.x0]);
        if (y < back) continue;
        let color = x % 6 === 0 ? STRIPE : BACK;
        room.floors.forEach((fy, i) => {
            const lowest = i === room.floors.length - 1;
            if (y >= fy - 2 && y < fy) color = (x + fy) % 7 === 0 ? PLANK_DARK : PLANK;
            else if (!lowest && y >= fy && y < fy + 2) color = BEAM;
        });
        c.put(x, y, color);
        visible.add(key);
    }
    shape(c, rng, visible);
    for (const room of rooms) {
        const lowestFloor = room.floors[room.floors.length - 1];
        for (const fy of room.floors) {
            // On the ground floor, what the broken wall in front still hides covers the floor, so the furniture stands on the lowest part of the room that shows.
            const standing = (x: number) => {
                if (fy !== lowestFloor) return fy - 3;
                for (let y = fy - 3; y >= room.top; y -= 1) if (visible.has(y * c.w + x)) return y;
                return -1;
            };
            let x = room.x0 + 4 + Math.floor(rng() * 4);
            const stamp = (piece: readonly string[], px: number, bottom: number) =>
                piece.forEach((row, ry) => [...row].forEach((ch, rx) => {
                    const y = bottom - piece.length + 1 + ry;
                    if (ch !== " " && ch !== "." && visible.has(y * c.w + px + rx)) c.put(px + rx, y, FURNITURE[ch]);
                }));
            stamp(FRAME, x + 2 + Math.floor(rng() * 6), fy - 17);
            const first = Math.floor(rng() * PIECES.length);
            for (let i = 0; x < room.x1 - 6; i += 1) {
                const piece = PIECES[(first + i) % PIECES.length];
                stamp(piece, x, standing(x + (piece[0].length >> 1)));
                x += piece[0].length + 3 + Math.floor(rng() * 6);
            }
        }
    }
}

function half(c: Canvas, rng: () => number, breaks: Breaks, rooms: readonly Room[]) {
    const { w, h } = c;
    const side = rng() < 0.5 ? -1 : 1;
    // The collapsed corner: the wall is gone down to a low stub at the outer edge, rising to the full height inside.
    const cw = Math.round(w * (0.42 + rng() * 0.1));
    const stub = Math.round(h * (0.18 + rng() * 0.08));
    const slant = walk(rng, cw, 0, 1.6, -2, 2);
    // The wall is down to the stub for most of the corner, then climbs back to its full height.
    const flat = Math.round(cw * 0.55);
    const keep = Array.from({ length: cw }, (_, i) => Math.max(0, Math.round(i < flat ? h - stub + slant[i] : (h - stub) * (1 - (i - flat) / (cw - flat)) + slant[i])));
    const x0 = side < 0 ? 0 : w - cw;
    cut(c, x0, side < 0 ? keep : [...keep].reverse(), breaks);

    // A bite out of the roof on the standing side.
    const bw = Math.round(w * (0.22 + rng() * 0.08));
    const bx = side < 0 ? Math.round(w * 0.58) : Math.round(w * 0.1);
    const depth = Math.round(h * (0.16 + rng() * 0.08));
    const wobble = walk(rng, bw, 0, 1.4, -2, 2);
    const bite = Array.from({ length: bw }, (_, i) => c.top(bx + i) + Math.max(1, Math.round(depth * Math.sin((Math.PI * (i + 0.5)) / bw) + wobble[i])));
    cut(c, bx, bite, breaks);
    ragged(c, rng, breaks.opened);
    interior(c, rng, rooms, breaks.opened, false);
    // The bite keeps its flat top where it meets the collapsed corner's edge, so beams stand on its break.
    [bx + 2, bx + bw - 3].forEach((x, i) => beam(c, rng, x, bite[x - bx] - 1, i ? 1 : -1, 4 + Math.floor(rng() * 4)));

    // Shell holes in the wall that is still standing, and cracks under them.
    const standing = side < 0 ? [cw + 2, w - 4] : [3, w - cw - 4];
    for (let i = 0; i < 2; i += 1) {
        const hx = Math.round(standing[0] + rng() * Math.max(1, standing[1] - standing[0]));
        const hy = Math.round(h * (0.52 + rng() * 0.2));
        hole(c, rng, hx, hy, 2 + Math.floor(rng() * 2), breaks);
        crack(c, rng, hx + (rng() < 0.5 ? -2 : 2), hy + 2, 6 + Math.floor(rng() * 6));
    }
    crack(c, rng, Math.round(standing[0] + rng() * (standing[1] - standing[0])), Math.round(h * 0.35), 8);

    const reach = cw + 3;
    heap(c, rng, side < 0 ? 1 : w - 1 - reach, bell(reach, Math.round(h * 0.13 + 2), rng));
}

function ruin(c: Canvas, rng: () => number, breaks: Breaks, rooms: readonly Room[]) {
    const { w, h } = c;
    // What is left is a low, broken wall all the way across, with one taller piece of it still standing at one side.
    const side = rng() < 0.5 ? -1 : 1;
    const low = Math.round(h * (0.17 + rng() * 0.05));
    const tallW = Math.round(w * (0.2 + rng() * 0.06));
    const tallH = Math.round(h * (0.62 + rng() * 0.1));
    const ground = walk(rng, w, h - low, 3, h - low - 4, h - low + 8);
    const keep = ground.map((g, i) => {
        const x = side < 0 ? i : w - 1 - i;
        if (x < 0 || x >= tallW) return g;
        const slope = (1 - x / tallW) * 0.5;
        return Math.round(Math.min(g, h - tallH + slope * (tallH - low) * (x / tallW) * 2));
    });
    cut(c, 0, keep, breaks);
    ragged(c, rng, breaks.opened);
    interior(c, rng, rooms, breaks.opened, true);

    // Windows blown out of what is left, and the wall pitted by fire.
    const holes = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < holes; i += 1) {
        const hx = 3 + Math.floor(rng() * (w - 6));
        const top = keep[Math.min(w - 1, hx)];
        const hy = Math.min(h - 6, top + 4 + Math.floor(rng() * 5));
        hole(c, rng, hx, hy, 1 + Math.floor(rng() * 3), breaks);
    }
    for (let i = 0; i < 4; i += 1) {
        const x = 2 + Math.floor(rng() * (w - 4));
        crack(c, rng, x, keep[x] + 2, 5 + Math.floor(rng() * 6));
    }
    // Rafters and a beam or two out of the broken tops.
    for (let i = 0; i < 4; i += 1) {
        const x = 3 + Math.floor(rng() * (w - 6));
        beam(c, rng, x, keep[x] - 1, rng() < 0.5 ? -1 : 1, 3 + Math.floor(rng() * 5));
    }
    // Heaps of rubble over the stub, and more at one end.
    let x = 1;
    while (x < w - 4) {
        const n = 6 + Math.floor(rng() * 8);
        heap(c, rng, x, bell(Math.min(n, w - 2 - x), Math.round(h * 0.1 + 2 + rng() * h * 0.08), rng));
        x += n + Math.floor(rng() * 5);
    }
}

/** Blackens the broken edges and the ground round every fire. A lit pixel is a shade darker the closer it is. */
function scorch(c: Canvas, rng: () => number, breaks: Breaks, whole: number) {
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

/**
 * Returns the building's picture, damaged. `key` is the building's key, which seeds every choice, `raster` is the whole
 * building drawn undamaged and `rooms` are the rooms behind its walls. The bottom row of the picture is never cleared, so the building still stands on its ground line,
 * and nothing is drawn on its top corners.
 */
export function damageRaster(raster: Raster, level: Exclude<BuildingDamage, "none">, key: string, rooms: readonly Room[]): Raster {
    const c = new Canvas(raster.width, raster.height, raster);
    const rng = seeded(`${level}|${key}`);
    const breaks: Breaks = { sources: [], opened: new Set() };
    if (level === "half") half(c, rng, breaks, rooms);
    else ruin(c, rng, breaks, rooms);
    edges(c, breaks.opened);
    scorch(c, rng, breaks, level === "ruin" ? 0.22 : 0.1);
    return { width: raster.width, height: raster.height, colors: c.colors, px: c.px };
}

/** A finished picture as the one layer of a building, so a damaged building takes the place of the layers it was drawn from. */
export function rasterLayer(raster: Raster): Layer {
    return { sprite: { width: raster.width, height: raster.height, originX: 0, originY: 0, px: raster.px }, slots: raster.colors, x: 0, y: 0 };
}
