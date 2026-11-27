import type { Layer } from "../../../core/compose";
import type { Frame } from "../frame";
import { acUnitParts, cardboardBoxParts, flowerBedParts, hvacUnitParts, placeParts, roofVentParts, shrubBedParts, skylightParts, solarPanelParts } from "../parts";

/** A flat area of a roof, from (x0, y0) up to, not including, (x1, y1). */
export interface Area {
    readonly x0: number;
    readonly y0: number;
    readonly x1: number;
    readonly y1: number;
}

interface Rect {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
}

/**
 * Puts things on a roof one at a time and keeps each one on the area, clear of the ones before it: a thing that would hang over
 * the edge or touch another is left out. A stack of boxes is one thing, so the boxes in it may touch.
 */
class Roof {
    private readonly placed: Rect[] = [];
    readonly layers: Layer[] = [];

    constructor(private readonly area: Area) {}

    put(rect: Rect, draw: () => Layer[]): void {
        const { x0, y0, x1, y1 } = this.area;
        if (rect.x < x0 || rect.y < y0 || rect.x + rect.w > x1 || rect.y + rect.h > y1) return;
        // One pixel apart at least.
        if (this.placed.some((o) => rect.x < o.x + o.w + 1 && o.x < rect.x + rect.w + 1 && rect.y < o.y + o.h + 1 && o.y < rect.y + rect.h + 1)) return;
        this.placed.push(rect);
        this.layers.push(...draw());
    }
}

/** What is on the flat part of a roof: air conditioners and vents, an air-handling unit, boxes, skylights, rows of solar panels, or a garden. */
export function drawRooftop(f: Frame, area: Area): Layer[] {
    const { c, ramps } = f;
    const w = area.x1 - area.x0;
    const h = area.y1 - area.y0;
    const roof = new Roof(area);
    const at = (parts: Parameters<typeof placeParts>[1], x: number, y: number) => () => placeParts(f, parts, x, y);

    // The sizes of what is put on a roof (its picture, top-left to bottom-right).
    const ac = (x: number, y: number) => roof.put({ x, y, w: 12, h: 11 }, at(acUnitParts, x, y));
    const vent = (x: number, y: number) => roof.put({ x: x - 1, y, w: 6, h: 10 }, at(roofVentParts, x, y));
    const skylight = (x: number, y: number) => roof.put({ x, y, w: 14, h: 12 }, at(skylightParts, x, y));
    const panel = (x: number, y: number) => roof.put({ x, y, w: 14, h: 9 }, at(solarPanelParts, x, y));
    const bed = (x: number, y: number, withShrub: boolean) => roof.put({ x, y: y - 2, w: 22, h: 13 }, at(withShrub ? shrubBedParts : flowerBedParts, x, y));
    const hvac = (x: number, y: number) => roof.put({ x, y, w: 24, h: 14 }, at(hvacUnitParts, x, y));
    const box = (x: number, y: number) => roof.put({ x, y, w: 10, h: 9 }, at(cardboardBoxParts, x, y));
    const stack = (x: number, bottom: number) =>
        roof.put({ x, y: bottom - 6, w: 21, h: 15 }, () => [x, x + 11, x + 5].flatMap((bx, i) => placeParts(f, cardboardBoxParts, bx, i === 2 ? bottom - 6 : bottom)));

    switch (c.rooftop) {
        case "vents": {
            // An air conditioner (two on a wide roof) and a few vent pipes between and beside them.
            const wide = w >= 70;
            const middle = area.y0 + Math.round((h - 11) / 2);
            ac(area.x0 + Math.round(w * (wide ? 0.1 : 0.18)), middle);
            if (wide) ac(area.x0 + Math.round(w * 0.68), middle);
            const first = area.x0 + Math.round(w * (wide ? 0.4 : 0.62));
            vent(first, area.y0 + 1);
            vent(first + (wide ? 12 : 10), area.y1 - 10);
            if (wide) vent(area.x0 + Math.round(w * 0.88), area.y0 + 2);
            break;
        }
        case "machinery": {
            // A big air-handling unit in one corner, an air conditioner opposite and a vent pipe between them.
            hvac(area.x0 + 2, area.y0 + 2);
            ac(area.x1 - 14, area.y0 + Math.round(h * 0.4));
            vent(area.x0 + 30, area.y0 + 3);
            break;
        }
        case "boxes": {
            // A stack of three boxes in one corner, an air conditioner, and on a wide roof a box on its own.
            stack(area.x0 + 2, area.y1 - 9);
            ac(area.x1 - 14, area.y0 + 1);
            if (w >= 70) box(area.x0 + Math.round(w * 0.55), area.y0 + 2);
            break;
        }
        case "skylights": {
            const count = Math.max(1, Math.min(4, Math.floor((w + 6) / 20)));
            const lines = h >= 38 ? 2 : 1;
            const left = area.x0 + Math.round((w - (count * 14 + (count - 1) * 6)) / 2);
            const top = area.y0 + Math.round((h - (lines * 12 + (lines - 1) * 8)) / 2);
            for (let r = 0; r < lines; r += 1) for (let i = 0; i < count; i += 1) skylight(left + i * 20, top + r * 20);
            break;
        }
        case "solar": {
            const cols = Math.floor((w + 2) / 16);
            const rows = Math.min(3, Math.floor((h + 2) / 11));
            const left = area.x0 + Math.round((w - (cols * 16 - 2)) / 2);
            const top = area.y0 + Math.round((h - (rows * 11 - 2)) / 2);
            for (let r = 0; r < rows; r += 1) for (let col = 0; col < cols; col += 1) panel(left + col * 16, top + r * 11);
            break;
        }
        case "garden": {
            // Raised planter beds in rows with paths between them, a shrub in some and flowers in the rest, every other one alike.
            const cols = Math.floor((w + 3) / 25);
            const rows = Math.floor((h + 3) / 16);
            const left = area.x0 + Math.round((w - (cols * 25 - 3)) / 2);
            const top = area.y0 + Math.round((h - (rows * 16 - 3)) / 2);
            for (let r = 0; r < rows; r += 1) for (let col = 0; col < cols; col += 1) bed(left + col * 25, top + 2 + r * 16, (col + r) % 2 === 0);
            break;
        }
        default:
            return [];
    }
    return roof.layers;
}
