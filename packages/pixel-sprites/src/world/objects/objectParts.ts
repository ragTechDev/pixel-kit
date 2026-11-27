import type { PixelMask } from "../../core/maskUtils";
import { bookshelfBooksMask } from "../masks/objects/bookshelf/books.mask";
import { bookshelfFrameMask } from "../masks/objects/bookshelf/frame.mask";
import { counterBodyMask } from "../masks/objects/counter/body.mask";
import { counterTopMask } from "../masks/objects/counter/top.mask";
import { doorKnobMask } from "../masks/objects/door/knob.mask";
import { doorPanelMask } from "../masks/objects/door/panel.mask";
import { fencePostsMask } from "../masks/objects/fence/posts.mask";
import { fenceRailsMask } from "../masks/objects/fence/rails.mask";
import { flowerMask } from "../masks/objects/flower.mask";
import { rugClothMask } from "../masks/objects/rug/cloth.mask";
import { rugRingMask } from "../masks/objects/rug/ring.mask";
import { windowFrameMask } from "../masks/objects/window/frame.mask";
import { windowGlassMask } from "../masks/objects/window/glass.mask";
import { treeCanopyMask } from "../masks/objects/tree/canopy.mask";
import { treeTrunkMask } from "../masks/objects/tree/trunk.mask";
import { cashRegisterBodyMask } from "../masks/objects/cashRegister/body.mask";
import { cashRegisterKeysMask } from "../masks/objects/cashRegister/keys.mask";
import { cashRegisterScreenMask } from "../masks/objects/cashRegister/screen.mask";
import { cashRegisterTillMask } from "../masks/objects/cashRegister/till.mask";
import { cashRegisterTopMask } from "../masks/objects/cashRegister/top.mask";
import { chairBackMask } from "../masks/objects/chair/back.mask";
import { chairLegMask } from "../masks/objects/chair/leg.mask";
import { chairSeatMask } from "../masks/objects/chair/seat.mask";
import { chalkboardBoardMask } from "../masks/objects/chalkboard/board.mask";
import { chalkboardChalkMask } from "../masks/objects/chalkboard/chalk.mask";
import { chalkboardFrameMask } from "../masks/objects/chalkboard/frame.mask";
import { fridgeBodyMask } from "../masks/objects/fridge/body.mask";
import { fridgeHandleMask } from "../masks/objects/fridge/handle.mask";
import { fridgeSeamMask } from "../masks/objects/fridge/seam.mask";
import { groceryShelfBoxesMask } from "../masks/objects/groceryShelf/boxes.mask";
import { groceryShelfCansMask } from "../masks/objects/groceryShelf/cans.mask";
import { groceryShelfJarsMask } from "../masks/objects/groceryShelf/jars.mask";
import { produceCrateApplesMask } from "../masks/objects/produceCrate/apples.mask";
import { produceCrateCrateMask } from "../masks/objects/produceCrate/crate.mask";
import { produceCrateGreensMask } from "../masks/objects/produceCrate/greens.mask";
import { produceCrateOrangesMask } from "../masks/objects/produceCrate/oranges.mask";
import { produceCrateSlatsMask } from "../masks/objects/produceCrate/slats.mask";
import { sinkBasinMask } from "../masks/objects/sink/basin.mask";
import { sinkCabinetMask } from "../masks/objects/sink/cabinet.mask";
import { sinkFaucetMask } from "../masks/objects/sink/faucet.mask";
import { sinkSeamMask } from "../masks/objects/sink/seam.mask";
import { sinkTopMask } from "../masks/objects/sink/top.mask";
import { stoveBodyMask } from "../masks/objects/stove/body.mask";
import { stoveCooktopMask } from "../masks/objects/stove/cooktop.mask";
import { stoveKnobsMask } from "../masks/objects/stove/knobs.mask";
import { stovePotMask } from "../masks/objects/stove/pot.mask";
import { stoveWindowMask } from "../masks/objects/stove/window.mask";
import { tableHemMask } from "../masks/objects/table/hem.mask";
import { tableLegMask } from "../masks/objects/table/leg.mask";
import { tablePlateMask } from "../masks/objects/table/plate.mask";
import { tableTopMask } from "../masks/objects/table/top.mask";
import type { ObjectId } from "../types";
import type { TileTheme } from "../tiles/palettes";
import type { ObjectRampId } from "./ramps";
import { fruitItemParts, fruitTreeParts } from "./fruitTree";
import { cropParts, vegItemParts } from "./vegetables";

/**
 * One mask of an object, drawn with a fixed ramp. `x` and `y` are the pixel
 * position of the mask's top-left corner inside the object's tile box (16 px
 * per tile). The outline adds one pixel around each part.
 */
export interface ObjectPart {
    readonly mask: PixelMask;
    readonly ramp: ObjectRampId;
    /** Ramps for the seasons that change this part. Summer uses `ramp`. `null` leaves the part out that season. */
    readonly seasonal?: Partial<Record<TileTheme, ObjectRampId | null>>;
    /** Paints every pixel of the mask in one tone of `ramp` (no outline or shading of its own), for detail over another part. */
    readonly tone?: "shadow" | "highlight";
    readonly x: number;
    readonly y: number;
}

/** Parts are drawn in order, later parts on top. */
export const objectParts: Record<ObjectId, readonly ObjectPart[]> = {
    // 1×2 tiles (16×32). Trunk first, canopy over it.
    tree: [
        { mask: treeTrunkMask, ramp: "bark", x: 5, y: 14 },
        { mask: treeCanopyMask, ramp: "leaf", seasonal: { spring: "leaf_spring", autumn: "leaf_autumn", winter: "leaf_snow", ash: "leaf_ash" }, x: 1, y: 1 }
    ],
    // 2×3 tiles (32×48). Drawn from options, see fruitTree.ts: this is the default, a mature apple tree.
    fruit_tree: fruitTreeParts(),
    // 1×1 tile, sits on the ground. Picked fruit.
    ...fruitItemParts,
    // Vegetables: growing in a field (1×1, and corn 1×2) and picked (1×1). See vegetables.ts.
    ...cropParts,
    ...vegItemParts,
    // 1×1 tile. Two posts with two rails across them.
    fence: [
        { mask: fencePostsMask, ramp: "wood", x: 1, y: 2 },
        { mask: fenceRailsMask, ramp: "wood", x: 1, y: 4 }
    ],
    // 1×1 tile. A door with a knob, meant to sit in a wall.
    door: [
        { mask: doorPanelMask, ramp: "wood", x: 2, y: 1 },
        { mask: doorKnobMask, ramp: "gold", x: 10, y: 8 }
    ],
    // 1×1 tile. A frame with a pane of glass, meant to sit in a wall.
    window: [
        { mask: windowFrameMask, ramp: "wood", x: 2, y: 3 },
        { mask: windowGlassMask, ramp: "glass", x: 4, y: 5 }
    ],
    // 2×1 tiles (32×16). A lighter top slab over the front panel.
    counter: [
        { mask: counterBodyMask, ramp: "wood", x: 1, y: 2 },
        { mask: counterTopMask, ramp: "wood_light", x: 1, y: 2 }
    ],
    // 1×2 tiles (16×32). A frame with three rows of books, one mask in three colours.
    bookshelf: [
        { mask: bookshelfFrameMask, ramp: "wood", x: 1, y: 1 },
        { mask: bookshelfBooksMask, ramp: "book_blue", x: 2, y: 3 },
        { mask: bookshelfBooksMask, ramp: "book_red", x: 2, y: 12 },
        { mask: bookshelfBooksMask, ramp: "book_green", x: 2, y: 21 }
    ],
    // 2×2 tiles (32×32), sits on the floor. A cloth rug with a gold border ring.
    rug: [
        { mask: rugClothMask, ramp: "cloth_red", x: 2, y: 2 },
        { mask: rugRingMask, ramp: "gold", x: 6, y: 6 }
    ],
    // 2×1 tiles (32×16). A cloth over a top, two legs and two plates.
    table: [
        { mask: tableLegMask, ramp: "wood", x: 3, y: 9 },
        { mask: tableLegMask, ramp: "wood", x: 27, y: 9 },
        { mask: tableTopMask, ramp: "cloth_white", x: 1, y: 2 },
        { mask: tableHemMask, ramp: "cloth_white", tone: "shadow", x: 1, y: 8 },
        { mask: tablePlateMask, ramp: "gold", tone: "highlight", x: 7, y: 4 },
        { mask: tablePlateMask, ramp: "gold", tone: "highlight", x: 20, y: 4 }
    ],
    // 1×1 tile. A chair seen from the front: a backrest, a seat and two legs.
    chair: [
        { mask: chairLegMask, ramp: "wood", x: 3, y: 10 },
        { mask: chairLegMask, ramp: "wood", x: 11, y: 10 },
        { mask: chairBackMask, ramp: "wood", x: 4, y: 1 },
        { mask: chairSeatMask, ramp: "wood_light", x: 3, y: 7 }
    ],
    // 1×1 tile. A steel range with a pot on its cooktop, knobs and an oven window.
    stove: [
        { mask: stovePotMask, ramp: "steel", x: 5, y: 2 },
        { mask: stoveCooktopMask, ramp: "cast_iron", x: 1, y: 5 },
        { mask: stoveBodyMask, ramp: "steel", x: 1, y: 8 },
        { mask: stoveKnobsMask, ramp: "gold", tone: "highlight", x: 3, y: 9 },
        { mask: stoveWindowMask, ramp: "glass", x: 4, y: 10 }
    ],
    // 1×1 tile. A steel top with a basin and a tap, over a cabinet.
    sink: [
        { mask: sinkCabinetMask, ramp: "wood", x: 1, y: 8 },
        { mask: sinkSeamMask, ramp: "wood", tone: "shadow", x: 8, y: 9 },
        { mask: sinkTopMask, ramp: "steel", x: 1, y: 4 },
        { mask: sinkBasinMask, ramp: "glass", x: 4, y: 5 },
        { mask: sinkFaucetMask, ramp: "steel", x: 6, y: 1 }
    ],
    // 1×2 tiles (16×32). A tall steel fridge with a seam between its doors and two handles.
    fridge: [
        { mask: fridgeBodyMask, ramp: "steel", x: 2, y: 2 },
        { mask: fridgeSeamMask, ramp: "steel", tone: "shadow", x: 2, y: 10 },
        { mask: fridgeHandleMask, ramp: "cast_iron", x: 4, y: 4 },
        { mask: fridgeHandleMask, ramp: "cast_iron", x: 4, y: 13 }
    ],
    // 1×1 tile. A counter with a till on it.
    cash_register: [
        { mask: cashRegisterBodyMask, ramp: "wood", x: 1, y: 8 },
        { mask: cashRegisterTopMask, ramp: "wood_light", x: 1, y: 5 },
        { mask: cashRegisterTillMask, ramp: "steel", x: 4, y: 1 },
        { mask: cashRegisterScreenMask, ramp: "glass", tone: "highlight", x: 5, y: 2 },
        { mask: cashRegisterKeysMask, ramp: "gold", tone: "highlight", x: 5, y: 4 }
    ],
    // 1×2 tiles (16×32). The bookshelf's frame with jars, boxes and cans on its three shelves.
    grocery_shelf: [
        { mask: bookshelfFrameMask, ramp: "wood", x: 1, y: 1 },
        { mask: groceryShelfJarsMask, ramp: "gold", x: 2, y: 3 },
        { mask: groceryShelfBoxesMask, ramp: "fruit_red", x: 2, y: 12 },
        { mask: groceryShelfCansMask, ramp: "book_green", x: 2, y: 23 }
    ],
    // 1×1 tile. A wooden crate heaped with apples, oranges and greens.
    produce_crate: [
        { mask: produceCrateCrateMask, ramp: "wood", x: 1, y: 7 },
        { mask: produceCrateSlatsMask, ramp: "wood", tone: "shadow", x: 1, y: 10 },
        { mask: produceCrateSlatsMask, ramp: "wood", tone: "shadow", x: 1, y: 13 },
        { mask: produceCrateApplesMask, ramp: "fruit_red", x: 2, y: 3 },
        { mask: produceCrateOrangesMask, ramp: "fruit_orange", x: 6, y: 2 },
        { mask: produceCrateGreensMask, ramp: "veg_cabbage", x: 10, y: 3 }
    ],
    // 1×1 tile. A framed slate board with chalk writing, meant to hang on a wall.
    chalkboard: [
        { mask: chalkboardFrameMask, ramp: "wood", x: 1, y: 2 },
        { mask: chalkboardBoardMask, ramp: "slate", x: 2, y: 3 },
        { mask: chalkboardChalkMask, ramp: "cloth_white", tone: "highlight", x: 3, y: 4 }
    ],
    // 1×1 tile, sits on the ground. One flower mask used three times.
    flower: [
        { mask: flowerMask, ramp: "flower_red", seasonal: { spring: "flower_pink", autumn: "flower_orange", winter: "flower_frost", ash: "flower_ash" }, x: 3, y: 3 },
        { mask: flowerMask, ramp: "flower_yellow", seasonal: { spring: "flower_white", autumn: "flower_rust", winter: "flower_ice", ash: "flower_ash" }, x: 10, y: 8 },
        { mask: flowerMask, ramp: "flower_red", seasonal: { spring: "flower_pink", autumn: "flower_orange", winter: "flower_frost", ash: "flower_ash" }, x: 5, y: 11 }
    ]
};
