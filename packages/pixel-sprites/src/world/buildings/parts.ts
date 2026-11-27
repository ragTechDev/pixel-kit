import type { Layer } from "../../core/compose";
import type { PixelMask } from "../../core/maskUtils";
import { acUnitBodyMask } from "../masks/buildings/acUnit/body.mask";
import { acUnitFrontMask } from "../masks/buildings/acUnit/front.mask";
import { acUnitLouvresMask } from "../masks/buildings/acUnit/louvres.mask";
import { acUnitFanMask } from "../masks/buildings/acUnit/fan.mask";
import { cardboardBoxBodyMask } from "../masks/buildings/cardboardBox/body.mask";
import { cardboardBoxFrontMask } from "../masks/buildings/cardboardBox/front.mask";
import { cardboardBoxTapeMask } from "../masks/buildings/cardboardBox/tape.mask";
import { barrelBodyMask } from "../masks/buildings/barrel/body.mask";
import { barrelHoopsMask } from "../masks/buildings/barrel/hoops.mask";
import { chimneyCapMask } from "../masks/buildings/chimney/cap.mask";
import { chimneyMortarMask } from "../masks/buildings/chimney/mortar.mask";
import { chimneyStackMask } from "../masks/buildings/chimney/stack.mask";
import { flowerBoxBloomsMask } from "../masks/buildings/flowerBox/blooms.mask";
import { flowerBoxBoxMask } from "../masks/buildings/flowerBox/box.mask";
import { flowerBoxLeavesMask } from "../masks/buildings/flowerBox/leaves.mask";
import { hvacUnitBodyMask } from "../masks/buildings/hvacUnit/body.mask";
import { hvacUnitFanMask } from "../masks/buildings/hvacUnit/fan.mask";
import { hvacUnitFrontMask } from "../masks/buildings/hvacUnit/front.mask";
import { hvacUnitLouvresMask } from "../masks/buildings/hvacUnit/louvres.mask";
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
import { plantBedBloomMask } from "../masks/buildings/plantBed/bloom.mask";
import { plantBedBodyMask } from "../masks/buildings/plantBed/body.mask";
import { plantBedFrontMask } from "../masks/buildings/plantBed/front.mask";
import { plantBedSoilMask } from "../masks/buildings/plantBed/soil.mask";
import { roofVentCapMask } from "../masks/buildings/roofVent/cap.mask";
import { roofVentPipeMask } from "../masks/buildings/roofVent/pipe.mask";
import { roundWindowGlassMask } from "../masks/buildings/roundWindow/glass.mask";
import { roundWindowRingMask } from "../masks/buildings/roundWindow/ring.mask";
import { shrubBodyMask } from "../masks/buildings/shrub/body.mask";
import { shrubLightMask } from "../masks/buildings/shrub/light.mask";
import { skylightFrameMask } from "../masks/buildings/skylight/frame.mask";
import { skylightFrontMask } from "../masks/buildings/skylight/front.mask";
import { skylightGlassMask } from "../masks/buildings/skylight/glass.mask";
import { solarPanelCellsMask } from "../masks/buildings/solarPanel/cells.mask";
import { solarPanelPanelMask } from "../masks/buildings/solarPanel/panel.mask";
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

/** Anchor: the top-left of the air conditioner, which shows its top and its front. */
export const acUnitParts: Part[] = [
    { mask: acUnitBodyMask, role: "metal", dx: 0, dy: 0 },
    { mask: acUnitFanMask, role: "metal", dx: 3, dy: 1, tone: "shadow" },
    { mask: acUnitFrontMask, role: "metal", dx: 0, dy: 7, tone: "shadow" },
    { mask: acUnitLouvresMask, role: "metal", dx: 0, dy: 7, tone: "outline" }
];

/** Anchor: the top-left of the pipe. The cap is wider, so it starts a pixel to the left. */
export const roofVentParts: Part[] = [
    { mask: roofVentPipeMask, role: "metal", dx: 0, dy: 2 },
    { mask: roofVentCapMask, role: "metal", dx: -1, dy: 0 }
];

/** Anchor: the top-left of the skylight's frame, which shows its top and its front. */
export const skylightParts: Part[] = [
    { mask: skylightFrameMask, role: "metal", dx: 0, dy: 0 },
    { mask: skylightGlassMask, role: "glass", dx: 2, dy: 2 },
    { mask: skylightFrontMask, role: "metal", dx: 0, dy: 8, tone: "shadow" }
];

/** Anchor: the top-left of the panel. */
export const solarPanelParts: Part[] = [
    { mask: solarPanelPanelMask, role: "solar", dx: 0, dy: 0 },
    { mask: solarPanelCellsMask, role: "solar", dx: 0, dy: 0, tone: "highlight" }
];

/** Anchor: the top-left of the air-handling unit, which shows its top and its front. */
export const hvacUnitParts: Part[] = [
    { mask: hvacUnitBodyMask, role: "metal", dx: 0, dy: 0 },
    { mask: hvacUnitFanMask, role: "metal", dx: 2, dy: 1, tone: "shadow" },
    { mask: hvacUnitLouvresMask, role: "metal", dx: 0, dy: 2, tone: "shadow" },
    { mask: hvacUnitFrontMask, role: "metal", dx: 0, dy: 10, tone: "shadow" }
];

/** Anchor: the top-left of the box, which shows its top and its front. */
export const cardboardBoxParts: Part[] = [
    { mask: cardboardBoxBodyMask, role: "cardboard", dx: 0, dy: 0 },
    { mask: cardboardBoxTapeMask, role: "cardboard", dx: 4, dy: 1, tone: "highlight" },
    { mask: cardboardBoxFrontMask, role: "cardboard", dx: 0, dy: 6, tone: "shadow" }
];

const bloom = (role: Role, dx: number, dy: number): Part => ({ mask: plantBedBloomMask, role, dx, dy, tone: "base" });

/** The planter bed itself: its wooden box and the soil in it. Anchor: the top-left of the bed. */
const plantBed: Part[] = [
    { mask: plantBedBodyMask, role: "wood", dx: 0, dy: 0 },
    { mask: plantBedFrontMask, role: "wood", dx: 0, dy: 7, tone: "shadow" },
    { mask: plantBedSoilMask, role: "soil", dx: 2, dy: 1, tone: "base" }
];

/** A bed with a shrub and a few flowers beside it. */
export const shrubBedParts: Part[] = [
    ...plantBed,
    { mask: shrubBodyMask, role: "leaf", dx: 2, dy: -2 },
    { mask: shrubLightMask, role: "leaf", dx: 3, dy: -1, tone: "highlight" },
    bloom("flower", 11, 3),
    bloom("gold", 14, 1),
    bloom("pink", 17, 3)
];

/** A bed of flowers in two rows. */
export const flowerBedParts: Part[] = [
    ...plantBed,
    bloom("flower", 3, 1),
    bloom("gold", 9, 1),
    bloom("pink", 15, 1),
    bloom("pink", 5, 3),
    bloom("flower", 11, 3),
    bloom("gold", 16, 3)
];
