import type { Layer } from "../../../core/compose";
import type { Frame } from "../frame";
import { acUnitParts, cardboardBoxParts, hvacUnitParts, placeParts, roofVentParts, skylightParts, solarPanelParts } from "../parts";
import { addRect, flat, paint } from "../shapes";
import { LIGHT, SHADOW } from "./common";

/** A flat area of a roof, from (x0, y0) up to, not including, (x1, y1). */
export interface Area {
    readonly x0: number;
    readonly y0: number;
    readonly x1: number;
    readonly y1: number;
}

/** What is on the flat part of a roof: an AC unit and vents, skylights, rows of solar panels, or a garden. */
export function drawRooftop(f: Frame, area: Area): Layer[] {
    const { c, ramps } = f;
    const w = area.x1 - area.x0;
    const h = area.y1 - area.y0;
    const layers: Layer[] = [];
    switch (c.rooftop) {
        case "vents": {
            if (w < 34 || h < 13) return [];
            // An air conditioner (two on a wide roof) and a few vent pipes between and beside them.
            const wide = w >= 70;
            const middle = area.y0 + Math.round((h - 11) / 2);
            layers.push(...placeParts(f, acUnitParts, area.x0 + Math.round(w * (wide ? 0.1 : 0.18)), middle));
            if (wide) layers.push(...placeParts(f, acUnitParts, area.x0 + Math.round(w * 0.68), middle));
            const vents = wide ? [[0.4, 0.12], [0.47, 0.55], [0.9, 0.15]] : [[0.62, 0.14], [0.74, 0.5]];
            for (const [x, y] of vents) layers.push(...placeParts(f, roofVentParts, area.x0 + Math.round(w * x), area.y0 + Math.round(h * y)));
            break;
        }
        case "machinery": {
            // A big air-handling unit in one corner, an air conditioner opposite and a vent pipe between them.
            if (w < 46 || h < 16) return [];
            layers.push(...placeParts(f, hvacUnitParts, area.x0 + 2, area.y0 + 2));
            layers.push(...placeParts(f, acUnitParts, area.x1 - 14, area.y0 + Math.round(h * 0.4)));
            layers.push(...placeParts(f, roofVentParts, area.x0 + 30, area.y0 + 3));
            break;
        }
        case "boxes": {
            // A stack of three boxes in one corner, one on its own, and an air conditioner.
            if (w < 40 || h < 16) return [];
            const bottom = area.y1 - 9;
            layers.push(...placeParts(f, cardboardBoxParts, area.x0 + 2, bottom));
            layers.push(...placeParts(f, cardboardBoxParts, area.x0 + 13, bottom));
            layers.push(...placeParts(f, cardboardBoxParts, area.x0 + 7, bottom - 6));
            layers.push(...placeParts(f, acUnitParts, area.x1 - 14, area.y0 + 1));
            if (w >= 70) layers.push(...placeParts(f, cardboardBoxParts, area.x0 + Math.round(w * 0.55), area.y0 + 2));
            break;
        }
        case "skylights": {
            if (w < 14 || h < 12) return [];
            const count = Math.max(1, Math.min(4, Math.floor((w + 6) / 20)));
            const lines = h >= 38 ? 2 : 1;
            const left = area.x0 + Math.round((w - (count * 14 + (count - 1) * 6)) / 2);
            const top = area.y0 + Math.round((h - (lines * 12 + (lines - 1) * 8)) / 2);
            for (let r = 0; r < lines; r += 1) for (let i = 0; i < count; i += 1) layers.push(...placeParts(f, skylightParts, left + i * 20, top + r * 20));
            break;
        }
        case "solar": {
            const cols = Math.floor((w + 2) / 16);
            const rows = Math.min(3, Math.floor((h + 2) / 11));
            if (cols < 1 || rows < 1) return [];
            const left = area.x0 + Math.round((w - (cols * 16 - 2)) / 2);
            const top = area.y0 + Math.round((h - (rows * 11 - 2)) / 2);
            for (let r = 0; r < rows; r += 1) for (let col = 0; col < cols; col += 1) layers.push(...placeParts(f, solarPanelParts, left + col * 16, top + r * 11));
            break;
        }
        case "garden": {
            if (w < 8 || h < 8) return [];
            // A raised bed: its soil from above, and its wooden front.
            const bed = addRect(f.here(), area.x0, area.y0, area.x1, area.y1 - 3);
            layers.push(...paint(addRect(f.here(), area.x0, area.y1 - 4, area.x1, area.y1), ramps.wood));
            layers.push(...paint(bed, ramps.leaf, (x, y) => ((x * 7 + y * 13) % 19 === 0 ? LIGHT : (x * 5 + y * 3) % 23 === 0 ? SHADOW : 0)));
            // Flowers in rows, every other row shifted.
            const reds = f.here();
            const yellows = f.here();
            for (let y = area.y0 + 4, row = 0; y < area.y1 - 8; y += 8, row += 1) {
                for (let x = area.x0 + 4 + (row % 2) * 6, n = 0; x < area.x1 - 4; x += 12, n += 1) addRect(n % 2 ? yellows : reds, x, y, x + 2, y + 2);
            }
            layers.push(...flat(reds, ramps.flower), ...flat(yellows, { ...ramps.flower, base: ramps.gold.base }));
            break;
        }
        default:
            return [];
    }
    return layers;
}
