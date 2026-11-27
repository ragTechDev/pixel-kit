import type { Layer } from "../../../core/compose";
import type { Frame } from "../frame";
import { chimneyParts, placeParts } from "../parts";
import { riseOf, TOP, type RoofKind } from "./common";
import { drawFlat } from "./flat";
import { drawHipFlat, drawMansard, flatTopDrop } from "./flatTop";
import { drawGambrel, gambrelSplit } from "./gambrel";
import { drawGable, drawHip, drawSideGable } from "./ridged";
import { drawRooftop, type Area } from "./rooftop";

export type { RoofKind } from "./common";

// The roofs, one file per family: `ridged.ts` (gable, saltbox, hip and the roof behind a wing), `flatTop.ts` (hip with a
// flat top and the mansard), `gambrel.ts` and `flat.ts`. Each draws
// the roof's slopes, and the gable its face on the wall. The roofs with a flat area also carry what is on it (`rooftop.ts`).

type Drawn = Layer[] | { layers: Layer[]; area: Area };

function drawKind(f: Frame, kind: RoofKind): Drawn {
    switch (kind) {
        case "gable": return drawGable(f);
        case "saltbox": return drawGable(f, Math.round(f.W * 0.36));
        case "hip": return drawHip(f);
        case "hipFlat": return drawHipFlat(f);
        case "mansard": return drawMansard(f);
        case "gambrel": return drawGambrel(f);
        case "flat": return drawFlat(f);
        case "sideGable": return drawSideGable(f);
    }
}

/** Where a chimney stands: the middle of it, and the row its cap starts on. On a ridged roof it rises through a slope, higher up on the rest. */
function chimneyPlace(f: Frame, kind: RoofKind): { cx: number; y: number } | undefined {
    if (f.c.chimney === "none") return undefined;
    const ridged = kind === "gable" || kind === "saltbox" || kind === "hip";
    return { cx: f.c.chimneyAt ?? Math.round(f.c.chimney === "left" ? f.W * 0.26 : f.W * 0.74), y: ridged ? 6 : 4 };
}

/** The roof of a building (or of the part of it that `kind` is for). What is on its flat part keeps clear of the chimney, which has the side it stands on to itself. */
export function drawRoof(f: Frame, kind: RoofKind = f.c.roof): Layer[] {
    const drawn = drawKind(f, kind);
    if (Array.isArray(drawn)) return drawn;
    let area = drawn.area;
    const chimney = chimneyPlace(f, kind);
    if (chimney) {
        // The cap is 13 wide, so the rooftop starts a pixel beyond it, on the side away from the chimney.
        area = chimney.cx < (area.x0 + area.x1) / 2 ? { ...area, x0: Math.max(area.x0, chimney.cx + 8) } : { ...area, x1: Math.min(area.x1, chimney.cx - 8) };
    }
    return [...drawn.layers, ...drawRooftop(f, area)];
}

/** A chimney rising through the roof. */
export function drawChimney(f: Frame, kind: RoofKind = f.c.roof): Layer[] {
    const chimney = chimneyPlace(f, kind);
    return chimney ? placeParts(f, chimneyParts, chimney.cx, chimney.y) : [];
}

/** The row where the side of a roof starts at its left or right edge: the top of the roof's outline there. A side wall rises to it. */
export function roofSideTop(f: Frame, kind: RoofKind): number {
    switch (kind) {
        case "gable":
        case "saltbox":
        case "hip":
            return TOP + riseOf(f.c.pitch);
        case "hipFlat": return TOP + flatTopDrop(f, 0);
        case "mansard": return TOP + flatTopDrop(f, 11);
        case "gambrel": return gambrelSplit(f);
        default: return TOP;
    }
}
