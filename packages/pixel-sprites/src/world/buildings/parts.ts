import type { Layer } from "../../core/compose";
import type { PixelMask } from "../../core/maskUtils";
import { barrelBodyMask } from "../masks/buildings/barrel/body.mask";
import { barrelHoopsMask } from "../masks/buildings/barrel/hoops.mask";
import { chimneyCapMask } from "../masks/buildings/chimney/cap.mask";
import { chimneyMortarMask } from "../masks/buildings/chimney/mortar.mask";
import { chimneyStackMask } from "../masks/buildings/chimney/stack.mask";
import { flowerBoxBloomsMask } from "../masks/buildings/flowerBox/blooms.mask";
import { flowerBoxBoxMask } from "../masks/buildings/flowerBox/box.mask";
import { flowerBoxLeavesMask } from "../masks/buildings/flowerBox/leaves.mask";
import { houseDoorFrameArchedMask } from "../masks/buildings/houseDoor/frameArched.mask";
import { houseDoorFrameMask } from "../masks/buildings/houseDoor/frame.mask";
import { houseDoorGroovesMask } from "../masks/buildings/houseDoor/grooves.mask";
import { houseDoorKnobMask } from "../masks/buildings/houseDoor/knob.mask";
import { houseDoorPanelArchedMask } from "../masks/buildings/houseDoor/panelArched.mask";
import { houseDoorPanelMask } from "../masks/buildings/houseDoor/panel.mask";
import { houseWindowBarsMask } from "../masks/buildings/houseWindow/bars.mask";
import { houseWindowFrameArchedMask } from "../masks/buildings/houseWindow/frameArched.mask";
import { houseWindowFrameMask } from "../masks/buildings/houseWindow/frame.mask";
import { houseWindowGlassArchedMask } from "../masks/buildings/houseWindow/glassArched.mask";
import { houseWindowGlassMask } from "../masks/buildings/houseWindow/glass.mask";
import { houseWindowGlintMask } from "../masks/buildings/houseWindow/glint.mask";
import { houseWindowShutterMask } from "../masks/buildings/houseWindow/shutter.mask";
import { houseWindowSlatsMask } from "../masks/buildings/houseWindow/slats.mask";
import { roundWindowGlassMask } from "../masks/buildings/roundWindow/glass.mask";
import { roundWindowRingMask } from "../masks/buildings/roundWindow/ring.mask";
import { stepsLowerMask } from "../masks/buildings/steps/lower.mask";
import { stepsUpperMask } from "../masks/buildings/steps/upper.mask";
import type { DoorStyle, WindowStyle } from "./config";
import type { Role } from "./frame";
import { maskLayer, type Tone } from "./shapes";
import type { Frame } from "./frame";

// The parts of a building that are one fixed size are masks (`src/world/masks/buildings`), like the parts of an object.
// A part is a mask, the ramp it is drawn in and where its top-left pixel is from the part's anchor: the foot of a door,
// the top middle of a window and so on. A part with a `tone` is a detail painted flat in that tone, with no outline.

export interface Part {
    readonly mask: PixelMask;
    readonly role: Role;
    readonly dx: number;
    readonly dy: number;
    readonly tone?: Tone;
}

/** The layers of some parts, anchored at pixel (ax, ay). Parts are drawn in order, later parts on top. */
export function placeParts(frame: Frame, parts: readonly Part[], ax: number, ay: number): Layer[] {
    return parts.map((part) => maskLayer(part.mask, frame.ramps[part.role], ax + part.dx, ay + part.dy, part.tone));
}

/** Anchor: the middle of the foot of the door. */
export const doorParts = (style: DoorStyle): Part[] => {
    const arched = style === "arched";
    return [
        { mask: arched ? houseDoorFrameArchedMask : houseDoorFrameMask, role: "trim", dx: -8, dy: -24 },
        { mask: arched ? houseDoorPanelArchedMask : houseDoorPanelMask, role: "door", dx: -6, dy: -22 },
        { mask: houseDoorGroovesMask, role: "door", dx: -6, dy: -22, tone: "shadow" },
        { mask: houseDoorKnobMask, role: "gold", dx: 3, dy: -10, tone: "base" }
    ];
};

/** Anchor: the middle of the top of the window's frame. Shutters are painted in the door's colour. */
export const windowParts = (style: WindowStyle): Part[] => {
    const arched = style === "arched";
    return [
        ...(style === "shuttered"
            ? ([-11, 8] as const).flatMap((dx): Part[] => [
                { mask: houseWindowShutterMask, role: "door", dx, dy: 0 },
                { mask: houseWindowSlatsMask, role: "door", dx, dy: 0, tone: "shadow" }
            ])
            : []),
        { mask: arched ? houseWindowFrameArchedMask : houseWindowFrameMask, role: "trim", dx: -7, dy: 0 },
        { mask: arched ? houseWindowGlassArchedMask : houseWindowGlassMask, role: "glass", dx: -5, dy: 2 },
        { mask: houseWindowGlintMask, role: "glass", dx: 2, dy: 3, tone: "highlight" },
        { mask: houseWindowBarsMask, role: "trim", dx: -5, dy: 2, tone: "base" }
    ];
};

/** Anchor: the middle of the top of the window it sits under. */
export const flowerBoxParts: Part[] = [
    { mask: flowerBoxBoxMask, role: "wood", dx: -8, dy: 16 },
    { mask: flowerBoxBloomsMask, role: "flower", dx: -5, dy: 14, tone: "base" },
    { mask: flowerBoxLeavesMask, role: "leaf", dx: -6, dy: 15, tone: "base" }
];

/** Anchor: the middle of the chimney, at the top of the picture. */
export const chimneyParts: Part[] = [
    { mask: chimneyStackMask, role: "brick", dx: -4, dy: 4 },
    { mask: chimneyMortarMask, role: "brick", dx: -4, dy: 4, tone: "shadow" },
    { mask: chimneyCapMask, role: "stone", dx: -6, dy: 2 }
];

/** Anchor: the top-left of the barrel, which stands on the ground. */
export const barrelParts: Part[] = [
    { mask: barrelBodyMask, role: "wood", dx: 0, dy: 0 },
    { mask: barrelHoopsMask, role: "wood", dx: 0, dy: 0, tone: "outline" }
];

/** Anchor: the middle of the foot of the door. */
export const stepParts: Part[] = [
    { mask: stepsUpperMask, role: "stone", dx: -9, dy: 0 },
    { mask: stepsLowerMask, role: "stone", dx: -11, dy: 2 }
];

/** Anchor: the middle of the round window. */
export const roundWindowParts: Part[] = [
    { mask: roundWindowRingMask, role: "trim", dx: -5, dy: -5 },
    { mask: roundWindowGlassMask, role: "glass", dx: -3, dy: -3 }
];
