import { colorRamps } from "../../core/colors";
import type { Layer } from "../../core/compose";
import { parseHex, rampFromHex } from "../../core/customColor";
import type { PixelMask } from "../../core/maskUtils";
import { rampSlots, shadeMask, SLOT, type Ramp, type Sprite } from "../../core/sprite";
import type { BuildingColor } from "./config";

// The small tools every part of a building is drawn with: filled areas of the building's box, the shaded layer for
// one, and the tones a pattern or a detail can be painted in. Everything is in pixels, with (0, 0) at the top-left.

/** A filled area of the building's box. */
export interface Shape {
    readonly w: number;
    readonly h: number;
    readonly on: Uint8Array;
}

export const shape = (w: number, h: number): Shape => ({ w, h, on: new Uint8Array(w * h) });
export const filled = (s: Shape, x: number, y: number) => x >= 0 && y >= 0 && x < s.w && y < s.h && s.on[y * s.w + x] === 1;

/** Fills the rectangle from (x0, y0) up to, not including, (x1, y1). */
export function addRect(s: Shape, x0: number, y0: number, x1: number, y1: number): Shape {
    for (let y = Math.max(0, y0); y < Math.min(s.h, y1); y += 1) for (let x = Math.max(0, x0); x < Math.min(s.w, x1); x += 1) s.on[y * s.w + x] = 1;
    return s;
}

/** Fills a polygon, sampling each pixel at its centre. A pixel on an edge counts as inside on both sides, so shapes stay symmetric. */
export function addPolygon(s: Shape, points: readonly (readonly [number, number])[]): Shape {
    for (let y = 0; y < s.h; y += 1) {
        const yc = y + 0.5;
        const xs: number[] = [];
        for (let i = 0; i < points.length; i += 1) {
            const [ax, ay] = points[i];
            const [bx, by] = points[(i + 1) % points.length];
            if ((ay <= yc && yc < by) || (by <= yc && yc < ay)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
        }
        xs.sort((p, q) => p - q);
        for (let i = 0; i + 1 < xs.length; i += 2) {
            for (let x = Math.max(0, Math.ceil(xs[i] - 0.5)); x <= Math.min(s.w - 1, Math.floor(xs[i + 1] - 0.5)); x += 1) s.on[y * s.w + x] = 1;
        }
    }
    return s;
}

export const mod = (n: number, m: number) => ((n % m) + m) % m;

/** What a pattern paints at a pixel: one of the tones below, or 0 to leave the pixel as it is. */
export type Pattern = (x: number, y: number) => number;

export const SHADOW: number = SLOT.shadow;
export const LIGHT: number = SLOT.highlight;
export const BASE: number = SLOT.base;
export const OUTLINE: number = SLOT.outline;
export type Tone = "outline" | "base" | "shadow" | "highlight";

function bounds(s: Shape) {
    let x0 = s.w, y0 = s.h, x1 = -1, y1 = -1;
    for (let y = 0; y < s.h; y += 1) for (let x = 0; x < s.w; x += 1) if (s.on[y * s.w + x]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/** The shaded layer for a shape in a ramp (an outline, a highlight top and left, a shadow bottom and right), with a pattern painted over its inside (never over its edge). */
export function paint(s: Shape, ramp: Ramp, pattern?: Pattern): Layer[] {
    const b = bounds(s);
    if (!b) return [];
    const { x0, y0, x1, y1 } = b;
    const mask: string[] = [];
    for (let y = y0; y <= y1; y += 1) {
        let row = "";
        for (let x = x0; x <= x1; x += 1) row += filled(s, x, y) ? "1" : "0";
        mask.push(row);
    }
    const base = shadeMask(mask);
    const slots = rampSlots(ramp);
    const layers: Layer[] = [{ sprite: base, slots, x: x0, y: y0 }];
    if (pattern) {
        const px = new Uint8Array(base.width * base.height);
        for (let y = y0; y <= y1; y += 1) {
            for (let x = x0; x <= x1; x += 1) {
                const inside = filled(s, x, y) && filled(s, x - 1, y) && filled(s, x + 1, y) && filled(s, x, y - 1) && filled(s, x, y + 1);
                if (inside) px[(y - y0 + 1) * base.width + (x - x0 + 1)] = pattern(x, y);
            }
        }
        layers.push({ sprite: { ...base, px }, slots, x: x0, y: y0 });
    }
    return layers;
}

/** A mask drawn with its top-left pixel at (x, y): shaded like every mask, or flat in one tone of the ramp (no outline) for a detail painted over a part. */
export function maskLayer(mask: PixelMask, ramp: Ramp, x: number, y: number, tone?: Tone): Layer {
    const slots = rampSlots(ramp);
    if (!tone) return { sprite: shadeMask(mask), slots, x, y };
    const width = mask[0]?.length ?? 0;
    const px = new Uint8Array(width * mask.length);
    mask.forEach((row, ry) => [...row].forEach((ch, rx) => ch === "1" && (px[ry * width + rx] = SLOT[tone])));
    const sprite: Sprite = { width, height: mask.length, originX: 0, originY: 0, px };
    return { sprite, slots, x, y };
}

export function rampOf(color: BuildingColor): Ramp {
    if (Object.prototype.hasOwnProperty.call(colorRamps, color)) return colorRamps[color as keyof typeof colorRamps];
    return rampFromHex(parseHex(color) ?? "#888888");
}
