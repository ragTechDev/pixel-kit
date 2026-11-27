import type { Layer } from "../../../core/compose";
import type { Frame } from "../frame";
import { chimneyParts, placeParts } from "../parts";
import { drawBarrel } from "./barrel";
import type { RoofKind } from "./common";
import { drawFlat } from "./flat";
import { drawHipFlat, drawMansard } from "./flatTop";
import { drawGambrel } from "./gambrel";
import { drawGable, drawHip, drawSideGable } from "./ridged";

export type { RoofKind } from "./common";

// The roofs, one file per family: `ridged.ts` (gable, saltbox, hip and the roof behind a wing), `flatTop.ts` (hip with a
// flat top and the mansard), `gambrel.ts`, `flat.ts` and `barrel.ts`. Each draws the roof's slopes, and the gable its face on the wall.

/** The roof of a building (or of the part of it that `kind` is for). */
export function drawRoof(f: Frame, kind: RoofKind = f.c.roof): Layer[] {
    switch (kind) {
        case "gable": return drawGable(f);
        case "saltbox": return drawGable(f, Math.round(f.W * 0.36));
        case "hip": return drawHip(f);
        case "hipFlat": return drawHipFlat(f);
        case "mansard": return drawMansard(f);
        case "gambrel": return drawGambrel(f);
        case "flat": return drawFlat(f);
        case "barrel": return drawBarrel(f);
        case "sideGable": return drawSideGable(f);
    }
}

/** A chimney rising through the roof: on a slope for the ridged roofs, higher up for the rest. */
export function drawChimney(f: Frame, kind: RoofKind = f.c.roof): Layer[] {
    if (f.c.chimney === "none") return [];
    const ridged = kind === "gable" || kind === "saltbox" || kind === "hip";
    return placeParts(f, chimneyParts, Math.round(f.c.chimney === "left" ? f.W * 0.26 : f.W * 0.74), ridged ? 6 : 4);
}
