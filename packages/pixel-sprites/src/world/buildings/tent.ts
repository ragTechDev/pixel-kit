import { colorRamps } from "../../core/colors";
import { composeSprites, type Layer, type Raster } from "../../core/compose";
import { parseHex } from "../../core/customColor";
import type { Ramp } from "../../core/sprite";
import { bell, darken, seeded } from "../damageTools";
import { objectRamps } from "../objects/ramps";
import { TILE_SIZE } from "../size";
import type { BuildingColor } from "./config";
import { addPolygon, addRect, BASE, blend, flat, LIGHT, mod, paint, rampOf, SHADOW, shape, type Shape } from "./shapes";

// A tent is its own small thing, not a building: no wall, roof or facade, so it has its own list of choices and its own
// drawing, a canvas shape with a door and a few ropes. It is seen from the front and above like a building, a whole number
// of tiles wide and tall with the ground on the bottom row, and its footprint is a solid block with the doorway at the
// foot of the middle column. It is drawn in code from polygons and cached; nothing here takes input but the fixed lists.

/** The shape of the tent: `ridge` (an A-frame with a ridge pole), `dome` (a rounded tent) or `lean` (a tarp on two poles, open at the front). */
export const tentStyles = ["ridge", "dome", "lean"] as const;
/** How many tiles wide a tent is. It is one tile less tall. */
export const tentSizes = [3, 4, 5] as const;
/** `none` is a standing tent, `ruin` is a collapsed, scorched and torn one. The footprint does not change. */
export const tentDamage = ["none", "ruin"] as const;

export type TentStyle = (typeof tentStyles)[number];
export type TentSize = (typeof tentSizes)[number];
export type TentDamage = (typeof tentDamage)[number];
/** The colour of the canvas: `"canvas"` (undyed, the default), a common colour name or a hex colour. */
export type TentColor = BuildingColor | "canvas";

export interface TentConfig {
    style?: TentStyle;
    size?: TentSize;
    color?: TentColor;
    damage?: TentDamage;
}

export type ResolvedTentConfig = Required<TentConfig>;

export const defaultTentConfig: ResolvedTentConfig = { style: "ridge", size: 4, color: "canvas", damage: "none" };

const canvas: Ramp = { outline: "#4A3F2C", base: "#CDBE92", shadow: "#A89A6C", highlight: "#E3D8B4" };
const rope: Ramp = { outline: "#4A3F2C", base: "#9A8A62", shadow: "#7A6C48", highlight: "#B8A87C" };
const dark: Ramp = { outline: "#1C1816", base: "#2E2622", shadow: "#231D1A", highlight: "#3A312C" };
const wood = objectRamps.wood;

const oneOf = <T,>(list: readonly T[], value: unknown, fallback: T): T => (list.includes(value as T) ? (value as T) : fallback);

/** Replaces anything that is not in the fixed lists with its default, and a colour that is not `"canvas"`, a common colour or a valid hex colour with the default. */
export function resolveTentConfig(config: TentConfig = {}): ResolvedTentConfig {
    const d = defaultTentConfig;
    const c = config as Record<string, unknown>;
    const color = typeof c.color === "string" && (c.color === "canvas" || Object.prototype.hasOwnProperty.call(colorRamps, c.color) ? c.color : parseHex(c.color));
    return {
        style: oneOf(tentStyles, c.style, d.style),
        size: oneOf(tentSizes, c.size, d.size),
        color: (color || d.color) as TentColor,
        damage: oneOf(tentDamage, c.damage, d.damage)
    };
}

/** A stable string for a config, for caching. */
export function tentKey(config: TentConfig = {}): string {
    return `tent|${Object.values(resolveTentConfig(config)).join("|")}`;
}

/** The size of a tent in tiles. */
export function tentBox(config?: TentConfig): { width: number; height: number } {
    const { size } = resolveTentConfig(config);
    return { width: size, height: size - 1 };
}

/** The tiles a tent covers: `#` is canvas and `D` is the cell at the foot of the doorway, where a walker can step in. One string per tile row. */
export function tentFootprint(config?: TentConfig): readonly string[] {
    const { width, height } = tentBox(config);
    const rows = Array.from({ length: height }, () => "#".repeat(width));
    const door = Math.floor(width / 2);
    rows[height - 1] = rows[height - 1].slice(0, door) + "D" + rows[height - 1].slice(door + 1);
    return rows;
}

/** A one-pixel line into a shape (Bresenham). */
function line(s: Shape, x0: number, y0: number, x1: number, y1: number): Shape {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const ex = Math.round(x1);
    const ey = Math.round(y1);
    const dx = Math.abs(ex - x);
    const dy = -Math.abs(ey - y);
    const sx = x < ex ? 1 : -1;
    const sy = y < ey ? 1 : -1;
    let err = dx + dy;
    for (;;) {
        addRect(s, x, y, x + 1, y + 1);
        if (x === ex && y === ey) return s;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x += sx; }
        if (e2 <= dx) { err += dx; y += sy; }
    }
}

/** The points of a half ellipse standing on `base`, from its left end to its right. */
function arch(cx: number, base: number, rx: number, ry: number): [number, number][] {
    const points: [number, number][] = [];
    for (let i = 0; i <= 20; i += 1) {
        const a = Math.PI - (Math.PI * i) / 20;
        points.push([cx + Math.cos(a) * rx, base - Math.sin(a) * ry]);
    }
    return points;
}

const lit = (r: Ramp): Ramp => ({ outline: r.outline, base: r.highlight, shadow: r.base, highlight: blend(r.highlight, "#ffffff", 0.35) });
const dim = (r: Ramp): Ramp => ({ outline: r.outline, base: r.shadow, shadow: blend(r.shadow, r.outline, 0.5), highlight: r.base });

/** The measurements of a tent's picture, in pixels. The ground is the bottom edge `H`; the back of the roof is `d` further up the picture. */
function measure(size: number) {
    const W = size * TILE_SIZE;
    const H = (size - 1) * TILE_SIZE;
    const d = size * 4;
    return { W, H, d, h: H - d - 1, xl: 5, xr: W - 5, mid: W / 2 };
}
type Measure = ReturnType<typeof measure>;

/** A guy rope from a point on the canvas to a peg in the ground, and the peg. */
function guy(m: Measure, ax: number, ay: number, px: number, py: number): Layer[] {
    const here = () => shape(m.W, m.H);
    return [...flat(line(here(), ax, ay, px, py), rope, BASE), ...flat(addRect(here(), px - 1, py, px + 1, py + 2), wood, SHADOW)];
}

function ridge(m: Measure, ramp: Ramp): Layer[] {
    const { W, H, d, h, xl, xr, mid } = m;
    const here = () => shape(W, H);
    const seams = (x0: number) => (x: number) => (mod(x - x0, 9) === 0 ? SHADOW : 0);
    const bw = Math.round(m.W * 0.26);
    const dh = Math.round(h * 0.6);
    const ropeY = H - d / 2;
    const u = 0.35;
    return [
        ...paint(addPolygon(here(), [[xl, H], [mid, H - h], [mid, H - d - h], [xl, H - d]]), lit(ramp), seams(xl)),
        ...paint(addPolygon(here(), [[xr, H], [mid, H - h], [mid, H - d - h], [xr, H - d]]), dim(ramp), seams(xr)),
        ...guy(m, xl + u * (mid - xl), ropeY - h * u, 1, ropeY + 1),
        ...guy(m, xr - u * (xr - mid), ropeY - h * u, W - 2, ropeY + 1),
        // The front: the canvas gable, stitched along the hem and patched, with a dark doorway and a flap tied back on each side.
        ...paint(addPolygon(here(), [[xl, H], [mid, H - h], [xr, H]]), ramp, (x, y) => (y === H - 4 && x % 2 === 0 ? SHADOW : 0)),
        ...paint(addRect(here(), xl + 6, H - 11, xl + 12, H - 6), lit(ramp), (x, y) => ((x + y) % 2 === 0 ? 0 : LIGHT)),
        ...paint(addPolygon(here(), [[mid - bw / 2, H], [mid, H - dh], [mid + bw / 2, H]]), dark),
        ...paint(addPolygon(here(), [[mid - bw / 2 - 5, H], [mid - 1, H - dh + 2], [mid - bw / 2, H]]), lit(ramp), () => LIGHT),
        ...paint(addPolygon(here(), [[mid + bw / 2 + 5, H], [mid + 1, H - dh + 2], [mid + bw / 2, H]]), lit(ramp), () => LIGHT)
    ];
}

function dome(m: Measure, ramp: Ramp): Layer[] {
    const { W, H, d, h, xl, xr, mid } = m;
    const here = () => shape(W, H);
    const rx = (xr - xl) / 2;
    // The whole dome, from the front half ellipse to the same one `d` further back, with the body between them.
    const body = here();
    for (let t = 0; t <= d; t += 1) addPolygon(body, arch(mid, H - t, rx, h));
    const ribs = (x: number) => (Math.abs(x + 0.5 - mid) > rx * 0.42 && Math.abs(x + 0.5 - mid) < rx * 0.42 + 1 ? SHADOW : 0);
    const bw = Math.round(W * 0.24);
    const ropeY = H - d / 2;
    return [
        ...paint(body, lit(ramp), ribs),
        ...guy(m, mid - rx * 0.8, ropeY - h * 0.5, 1, ropeY + 2),
        ...guy(m, mid + rx * 0.8, ropeY - h * 0.5, W - 2, ropeY + 2),
        ...paint(addPolygon(here(), arch(mid, H, rx, h)), ramp, (x, y) => (y === H - 4 && x % 2 === 0 ? SHADOW : 0)),
        ...paint(addPolygon(here(), arch(mid, H, bw / 2, h * 0.55)), dark),
        ...paint(addPolygon(here(), arch(mid - bw / 2 - 2.5, H, 2.5, h * 0.5)), lit(ramp), () => LIGHT),
        ...paint(addPolygon(here(), arch(mid + bw / 2 + 2.5, H, 2.5, h * 0.5)), lit(ramp), () => LIGHT)
    ];
}

function lean(m: Measure, ramp: Ramp): Layer[] {
    const { W, H, xl, xr, mid } = m;
    const here = () => shape(W, H);
    const edge = H - Math.round(H * 0.55);
    // The front edge of the tarp sags between its corners.
    const front: [number, number][] = [];
    for (let x = xr; x >= xl; x -= 2) front.push([x, edge + Math.round(2 * Math.sin(((x - xl) / (xr - xl)) * Math.PI * 3))]);
    const tarp = addPolygon(here(), [[xl + 4, 1], [xr - 4, 1], ...front]);
    const pole = (x: number) => paint(addRect(here(), x - 1, edge, x + 2, H), wood);
    return [
        ...paint(addRect(here(), xl + 2, edge, xr - 2, H), dark),
        ...pole(xl + 4),
        ...pole(xr - 4),
        ...paint(tarp, lit(ramp), (x) => (mod(x - mid, 12) === 0 ? SHADOW : 0)),
        // Grommets along the front edge.
        ...flat([xl + 6, mid, xr - 6].reduce((s, x) => addRect(s, x, edge - 2, x + 1, edge - 1), here()), ramp, SHADOW),
        ...guy(m, xl + 1, edge + 1, 1, H - 3),
        ...guy(m, xr - 1, edge + 1, W - 2, H - 3)
    ];
}

/** A collapsed tent: a scorched heap of canvas with a torn hole, a panel still half up on one side, and broken poles. */
function collapsed(m: Measure, ramp: Ramp, key: string): Layer[] {
    const { W, H, xl, xr } = m;
    const rng = seeded(`${key}|ruin`);
    const burnt: Ramp = { outline: darken(ramp.outline, 0.3), base: darken(ramp.base, 0.45), shadow: darken(ramp.shadow, 0.55), highlight: darken(ramp.highlight, 0.4) };
    const here = () => shape(W, H);
    const side = rng() < 0.5 ? -1 : 1;
    const span = xr - xl;
    const heights = bell(span, Math.round(H * 0.3), rng);
    const mound = here();
    heights.forEach((height, i) => addRect(mound, xl + i, H - height, xl + i + 1, H));
    const panelW = Math.round(span * 0.34);
    const px0 = side < 0 ? xl : xr - panelW;
    const panel = addPolygon(here(), [[px0, H], [px0 + (side < 0 ? panelW * 0.7 : panelW * 0.3), H - Math.round(H * 0.5)], [px0 + panelW, H]]);
    const holeX = xl + Math.round(span * (side < 0 ? 0.62 : 0.3));
    const hole = flat(addPolygon(here(), arch(holeX, H - 3, 3 + Math.floor(rng() * 2), 3)), { ...dark, base: "#1C1816" }, BASE);
    const poles = [0, 1].reduce((s) => {
        const x = xl + 4 + Math.floor(rng() * (span - 8));
        const top = H - (heights[x - xl] ?? 4);
        return line(s, x, top, x + (rng() < 0.5 ? -1 : 1) * (4 + Math.floor(rng() * 5)), top - 4 - Math.floor(rng() * 6));
    }, here());
    return [
        ...paint(panel, dim(burnt), (x) => (mod(x, 7) === 0 ? SHADOW : 0)),
        ...paint(mound, burnt, (x, y) => (mod(x * 2 + y, 11) === 0 ? SHADOW : 0)),
        ...hole,
        ...flat(poles, wood, BASE)
    ];
}

const drawn = new Map<string, Raster>();

/**
 * Returns the (memoised) raster for a tent, a whole number of tiles wide and tall (16 px per tile, see `tentBox`). The
 * bottom row of the picture is the ground the tent stands on.
 */
export function buildTent(config?: TentConfig): Raster {
    const c = resolveTentConfig(config);
    const key = tentKey(c);
    let raster = drawn.get(key);
    if (!raster) {
        const m = measure(c.size);
        const ramp = c.color === "canvas" ? canvas : rampOf(c.color);
        const layers = c.damage === "ruin" ? collapsed(m, ramp, key) : c.style === "ridge" ? ridge(m, ramp) : c.style === "dome" ? dome(m, ramp) : lean(m, ramp);
        raster = composeSprites(layers, { x: 0, y: 0, width: m.W, height: m.H });
        if (drawn.size > 256) drawn.clear();
        drawn.set(key, raster);
    }
    return raster;
}
