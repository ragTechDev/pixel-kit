import { colorRamps, type ColorName } from "../../core/colors";
import { parseHex, rampFromHex, type HexColor } from "../../core/customColor";
import { composeSprites, type Layer, type Raster } from "../../core/compose";
import { SLOT, rampSlots, shadeMask, type Sprite } from "../../core/sprite";
import { rasterLayer } from "../damageTools";
import { TILE_SIZE } from "../size";
import { defaultTileTheme, resolveTheme, type TileTheme } from "../tiles/palettes";
import type { CropId, FruitId, ObjectId, VegId } from "../types";
import { damageObjectRaster, objectDamage, type ObjectDamage } from "./damage";
import { objectParts, type ObjectPart } from "./objectParts";

export { objectDamage, type ObjectDamage };
import { objectRamps, type ObjectRampId } from "./ramps";
import { bushCount, cropFieldParts, cropIds, isBushCrop, maxProduce, vegIds } from "./vegetables";
import { fruitIds, maxFruit, fruitTreeParts, resolveFruitTree, type FruitTreeOptions } from "./fruitTree";

export interface ObjectInfo {
    /** Footprint width in tiles. */
    readonly width: number;
    /** Footprint height in tiles. */
    readonly height: number;
    /** "ground" objects (rugs, flowers) sit under "standing" ones and are drawn first. */
    readonly layer: "ground" | "standing";
    /** One string per tile row. `#` blocks movement, `.` is open. */
    readonly footprint: readonly string[];
    /**
     * Only the lowest this many pixels of what is drawn in the blocking cells block movement, so a character can walk in behind the rest
     * of the object (a bush's leaves) and fit between plants. The default is all of what is drawn there.
     */
    readonly foot?: number;
    /** A warp, such as a door. */
    readonly door?: true;
    /** Something you can interact across, such as a shop counter. */
    readonly counter?: true;
}

export const objectInfo: Record<ObjectId, ObjectInfo> = {
    tree: { width: 1, height: 2, layer: "standing", footprint: [".", "#"] },
    fruit_tree: { width: 2, height: 3, layer: "standing", footprint: ["..", "..", "##"] },
    ...(Object.fromEntries(fruitIds.map((id) => [id, { width: 1, height: 1, layer: "ground", footprint: ["."] }])) as unknown as Record<FruitId, ObjectInfo>),
    // A crop blocks only its base, like a tree trunk: a character stops flush against the foot of a cabbage and walks in behind its leaves, or
    // between two plants. Corn is two tiles tall and its stalk blocks at the bottom tile.
    ...(Object.fromEntries(cropIds.map((id) => [id, id === "crop_corn" ? { width: 1, height: 2, layer: "standing", footprint: [".", "#"], foot: 4 } : { width: 1, height: 1, layer: "standing", footprint: ["#"], foot: 4 }])) as unknown as Record<CropId, ObjectInfo>),
    ...(Object.fromEntries(vegIds.map((id) => [id, { width: 1, height: 1, layer: "ground", footprint: ["."] }])) as unknown as Record<VegId, ObjectInfo>),
    fence: { width: 1, height: 1, layer: "standing", footprint: ["#"] },
    door: { width: 1, height: 1, layer: "standing", footprint: ["."], door: true },
    window: { width: 1, height: 1, layer: "standing", footprint: ["#"] },
    counter: { width: 2, height: 1, layer: "standing", footprint: ["##"], counter: true },
    bookshelf: { width: 1, height: 2, layer: "standing", footprint: ["#", "#"] },
    rug: { width: 2, height: 2, layer: "ground", footprint: ["..", ".."] },
    flower: { width: 1, height: 1, layer: "ground", footprint: ["."] }
};

export const objectIds = Object.keys(objectInfo) as ObjectId[];

/** A sprite with every pixel of the mask in one slot, with no outline round it. */
function flatSprite(mask: ObjectPart["mask"], slot: number): Sprite {
    const width = mask[0]?.length ?? 0;
    const px = new Uint8Array(width * mask.length);
    mask.forEach((r, y) => [...r].forEach((c, x) => c === "1" && (px[y * width + x] = slot)));
    return { width, height: mask.length, originX: 0, originY: 0, px };
}

const partSprites = new WeakMap<ObjectPart, Sprite>();

function partSprite(part: ObjectPart): Sprite {
    let sprite = partSprites.get(part);
    if (!sprite) {
        sprite = part.tone ? flatSprite(part.mask, SLOT[part.tone]) : shadeMask(part.mask);
        partSprites.set(part, sprite);
    }
    return sprite;
}

/** The common colours each object can be shown in, replacing its main colour (the paint, leaves, cloth or petals). */
export const objectColors: Partial<Record<ObjectId, readonly ColorName[]>> = {
    tree: ["orange", "red", "yellow", "pink", "purple"],
    door: ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink", "white", "grey"],
    window: ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink", "white", "grey"],
    fence: ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink", "white", "grey"],
    bookshelf: ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink", "white", "grey"],
    rug: ["orange", "yellow", "green", "teal", "blue", "purple", "pink", "grey"],
    flower: ["orange", "pink", "purple", "blue", "white"]
};

/** The ramps of an object that `color` replaces. */
const accents: Partial<Record<ObjectId, readonly ObjectRampId[]>> = {
    tree: ["leaf"],
    door: ["wood"],
    window: ["wood"],
    fence: ["wood"],
    bookshelf: ["wood"],
    rug: ["cloth_red"],
    flower: ["flower_red", "flower_yellow"]
};

/** The most fruit, flowers, tomatoes or cobs an object can show with `count`. More are not drawn. */
export const produceLimits: Partial<Record<ObjectId, number>> = { fruit_tree: maxFruit, crop_tomato: maxProduce, crop_corn: maxProduce };

/** The objects with a main colour you can change with `color`. */
export const colorableObjectIds = objectIds.filter((id) => objectColors[id]);

/** The objects whose colours change with the season (the others look the same all year). */
export const seasonalObjectIds = objectIds.filter((id) => objectParts[id].some((part) => part.seasonal));

/** Internal: the layers of an object placed with its top-left corner at pixel (px, py). */
export function objectLayers(id: ObjectId, px: number, py: number, theme: TileTheme = defaultTileTheme, color?: ColorName | HexColor, damage: ObjectDamage = "none", grow?: FruitTreeOptions): Layer[] {
    const parts = id === "fruit_tree" ? fruitTreeParts(grow) : isBushCrop(id) ? cropFieldParts(id, bushCount(grow)) : objectParts[id];
    if (!parts) throw new Error(`Unknown object: ${String(id)}`);
    if (objectDamage.includes(damage) && damage !== "none") return [{ ...rasterLayer(buildObject(id, theme, color, damage, grow)), x: px, y: py }];
    return parts.flatMap((part) => (part.seasonal?.[theme] === null ? [] : [{
        sprite: partSprite(part),
        slots: rampSlots(color && accents[id]?.includes(part.ramp) ? (color.startsWith("#") ? rampFromHex(color as HexColor) : colorRamps[color as ColorName]) : objectRamps[part.seasonal?.[theme] || part.ramp]),
        x: px + part.x,
        y: py + part.y
    }]));
}

const built = new Map<string, Raster>();

/**
 * Returns the (memoised) raster for an object, sized to its tile footprint. Trees and flowers
 * change with the season (`seasonalObjectIds`); `theme` is a season as in `tileThemes`, and
 * unknown values fall back to summer. `color` is one of the object's common colours
 * (`objectColors`) or any hex colour such as `"#e8873a"`; anything else is ignored. `damage` is `"half"` or
 * `"ruin"` for a broken or burnt object (see `objectDamage`); anything else is the object as it was made. `grow` is the stage, bearing and
 * crop of a `fruit_tree` (see `FruitTreeOptions`). For a bush crop (`bushVegetables`) only `bearing` and `count` count, and `"none"` is the bare plant. It is ignored for other objects.
 */
export function buildObject(id: ObjectId, theme?: string, color?: ColorName | HexColor, damage?: ObjectDamage, grow?: FruitTreeOptions): Raster {
    const season = resolveTheme(theme);
    const chosen = objectColors[id] && color ? (objectColors[id]!.includes(color as ColorName) ? (color as ColorName) : parseHex(color)) : undefined;
    // A colour replaces the season's colour for the same part, so it does not need a season in its key.
    const level = damage === "half" || damage === "ruin" ? damage : "none";
    // A tree is drawn from its options; a bush crop is ripe, or bare once picked (`bearing: "none"`).
    const shape: FruitTreeOptions | undefined = id === "fruit_tree" ? resolveFruitTree(grow) : isBushCrop(id) ? { bearing: "fruit", count: bushCount(grow) } : undefined;
    const kind = id === "fruit_tree" ? `${id}:${shape!.stage}:${shape!.bearing}:${shape!.crop}:${shape!.count}` : isBushCrop(id) ? `${id}:${shape!.count}` : id;
    const whole = chosen ? `${kind}:${season}:${chosen}` : seasonalObjectIds.includes(id) ? `${kind}:${season}` : kind;
    const key = level === "none" ? whole : `${whole}!${level}`;
    let raster = built.get(key);
    if (!raster) {
        const { width, height } = objectInfo[id];
        const bounds = { x: 0, y: 0, width: width * TILE_SIZE, height: height * TILE_SIZE };
        raster = level === "none" ? composeSprites(objectLayers(id, 0, 0, season, chosen, "none", shape), bounds) : damageObjectRaster(id, buildObject(id, season, chosen, undefined, shape), level, key);
        built.set(key, raster);
    }
    return raster;
}
