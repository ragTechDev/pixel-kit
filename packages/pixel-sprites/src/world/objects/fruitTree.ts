import { getMaskHeight, getMaskWidth, type PixelMask } from "../../core/maskUtils";
import { seeded } from "../damageTools";
import { fruitCherryMask } from "../masks/objects/fruit/cherry.mask";
import { fruitLemonMask } from "../masks/objects/fruit/lemon.mask";
import { fruitOliveMask } from "../masks/objects/fruit/olive.mask";
import { fruitPearMask } from "../masks/objects/fruit/pear.mask";
import { fruitRoundMask } from "../masks/objects/fruit/round.mask";
import { fruitTreeSaplingLeavesMask } from "../masks/objects/fruitTree/saplingLeaves.mask";
import { fruitTreeSaplingStemMask } from "../masks/objects/fruitTree/saplingStem.mask";
import type { FruitId, TreeCrop } from "../types";
import type { ObjectPart } from "./objectParts";
import type { ObjectRampId } from "./ramps";

// A fruit tree is drawn from a few numbers rather than a mask per picture: a crown is a pile of round clumps, and the same pile scaled
// down is the young tree. The clumps give the crown its shape, the dark crescent under each one and the line where one hides another,
// so a crown reads as leaves in bunches. The art is seeded from the crop, so a crop always looks the same.

/** How far a tree has grown. A sapling and a young tree bear nothing. */
export const treeStages = ["sapling", "young", "mature"] as const;
export type TreeStage = (typeof treeStages)[number];

/** What a mature tree carries: leaves only, blossom, or ripe fruit. */
export const treeBearings = ["none", "flowers", "fruit"] as const;
export type TreeBearing = (typeof treeBearings)[number];

/** Each crop has a crown, leaves, blossom and fruit of its own. `fruit_<crop>` is the picked fruit, an object of its own. */
export const treeCrops = ["apple", "cherry", "peach", "pear", "orange", "lemon", "olive"] as const;

/** What a fruit tree is drawn as. Anything missing or unknown becomes `"mature"`, `"none"` and `"apple"`. */
export interface FruitTreeOptions {
    readonly stage?: TreeStage;
    readonly bearing?: TreeBearing;
    readonly crop?: TreeCrop;
}

export const fruitIds: readonly FruitId[] = treeCrops.map((crop) => `fruit_${crop}` as const);

type Lobe = readonly [cx: number, cy: number, r: number];
interface Crown {
    readonly w: number;
    readonly h: number;
    readonly lobes: readonly Lobe[];
}

const crowns = {
    round: { w: 28, h: 30, lobes: [[14, 16, 11], [7, 13, 7], [21, 13, 7], [10, 8, 7], [18, 8, 7], [14, 7, 6], [7, 22, 6], [21, 22, 6], [14, 24, 6]] },
    wide: { w: 28, h: 24, lobes: [[14, 13, 10], [6, 13, 6], [22, 13, 6], [10, 7, 7], [18, 7, 7], [4, 17, 4], [24, 17, 4], [14, 19, 5]] },
    oval: { w: 22, h: 30, lobes: [[11, 15, 9], [11, 8, 7], [7, 13, 6], [15, 13, 6], [7, 21, 5], [15, 21, 5], [11, 25, 5]] }
} as const satisfies Record<string, Crown>;

const deciduous = { spring: "leaf_spring", autumn: "leaf_autumn", winter: "leaf_snow", ash: "leaf_ash" } as const;
const evergreen = { ash: "leaf_ash" } as const;

interface CropLook {
    readonly crown: keyof typeof crowns;
    readonly leaf: ObjectRampId;
    readonly seasonal: NonNullable<ObjectPart["seasonal"]>;
    readonly bark: ObjectRampId;
    readonly blossom: ObjectRampId;
    readonly fruit: ObjectRampId;
    /** The picked fruit. */
    readonly item: PixelMask;
}

const looks: Record<TreeCrop, CropLook> = {
    apple: { crown: "round", leaf: "leaf", seasonal: deciduous, bark: "bark", blossom: "flower_white", fruit: "fruit_red", item: fruitRoundMask },
    cherry: { crown: "round", leaf: "leaf", seasonal: deciduous, bark: "bark", blossom: "flower_pink", fruit: "fruit_cherry", item: fruitCherryMask },
    peach: { crown: "round", leaf: "leaf", seasonal: deciduous, bark: "bark", blossom: "flower_pink", fruit: "fruit_peach", item: fruitRoundMask },
    pear: { crown: "oval", leaf: "leaf", seasonal: deciduous, bark: "bark", blossom: "flower_white", fruit: "fruit_pear", item: fruitPearMask },
    orange: { crown: "round", leaf: "leaf_citrus", seasonal: evergreen, bark: "bark", blossom: "flower_white", fruit: "fruit_orange", item: fruitRoundMask },
    lemon: { crown: "oval", leaf: "leaf_citrus", seasonal: evergreen, bark: "bark", blossom: "flower_white", fruit: "fruit_lemon", item: fruitLemonMask },
    olive: { crown: "wide", leaf: "leaf_olive", seasonal: evergreen, bark: "bark_olive", blossom: "flower_white", fruit: "fruit_olive", item: fruitOliveMask }
};

/** The picked fruit: a 16×16 ground object, one small mask centred. */
export const fruitItemParts = Object.fromEntries(
    treeCrops.map((crop) => {
        const { item, fruit } = looks[crop];
        const part: ObjectPart = { mask: item, ramp: fruit, x: Math.floor((16 - getMaskWidth(item)) / 2), y: Math.floor((16 - getMaskHeight(item)) / 2) };
        return [`fruit_${crop}`, [part]];
    })
) as unknown as Record<FruitId, readonly ObjectPart[]>;

/** Fills in the options that are missing or unknown. Only a mature tree bears flowers or fruit. */
export function resolveFruitTree(options?: FruitTreeOptions): Required<FruitTreeOptions> {
    const stage = treeStages.find((s) => s === options?.stage) ?? "mature";
    const crop = treeCrops.find((c) => c === options?.crop) ?? "apple";
    const bearing = stage === "mature" ? (treeBearings.find((b) => b === options?.bearing) ?? "none") : "none";
    return { stage, bearing, crop };
}

const row = (cells: readonly boolean[]) => cells.map((on) => (on ? "1" : "0")).join("");

/** A crown (a pile of clumps) as three masks of the same size: its shape, the crescents and gaps in shadow, and the lit specks. */
function drawCrown(lobes: readonly Lobe[], w: number, h: number, rng: () => number) {
    const owner = new Int8Array(w * h).fill(-1);
    lobes.forEach(([cx, cy, r], i) => {
        for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) owner[y * w + x] = i;
    });
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : owner[y * w + x]);
    const shade = new Uint8Array(w * h);
    const light = new Uint8Array(w * h);
    for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
            const i = at(x, y);
            if (i < 0) continue;
            const [cx, cy, r] = lobes[i];
            const dx = x + 0.5 - cx;
            const dy = y + 0.5 - cy;
            const rim = Math.hypot(dx, dy) > r - 2.2;
            // The underside of a clump, and where a clump is covered by the one drawn after it.
            const covered = [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].some((j) => j > i);
            if (covered || (rim && dy > 0.15 * r && dx > -0.4 * r)) shade[y * w + x] = 1;
            else if (rim && dy < -0.25 * r && dx < 0.25 * r) light[y * w + x] = 1;
            else if (rng() < 0.05) light[y * w + x] = 1;
        }
    }
    const mask = (cells: Uint8Array | Int8Array, on: (v: number) => boolean) => Array.from({ length: h }, (_, y) => row(Array.from({ length: w }, (_, x) => on(cells[y * w + x]))));
    return { owner, w, h, crown: mask(owner, (v) => v >= 0), shade: mask(shade, Boolean), light: mask(light, Boolean) };
}

/** Where fruit or blossom sit: spread over the crown, each with room round it. */
const petals = [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]] as const;
/** A round 4×4 fruit, so it reads as fruit and not as a flower. */
const round = [[0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2]] as const;

function spots(drawn: ReturnType<typeof drawCrown>, rng: () => number, count: number, shape: readonly (readonly [number, number])[]): PixelMask {
    const { owner, w, h } = drawn;
    const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && owner[y * w + x] >= 0;
    const chosen: [number, number][] = [];
    for (let tries = 0; tries < 400 && chosen.length < count; tries += 1) {
        const x = 3 + Math.floor(rng() * (w - 6));
        const y = 3 + Math.floor(rng() * (h - 6));
        const room = [-3, 0, 3].every((dy) => [-3, 0, 3].every((dx) => inside(x + dx, y + dy)));
        if (room && chosen.every(([cx, cy]) => Math.hypot(cx - x, cy - y) >= 7)) chosen.push([x, y]);
    }
    const cells = Array.from({ length: h }, () => Array<boolean>(w).fill(false));
    for (const [x, y] of chosen) for (const [dx, dy] of shape) cells[y + dy][x + dx] = true;
    return cells.map(row);
}

/** A trunk `w` wide and `h` tall that flares into roots over its last rows. */
function trunk(w: number, h: number, flare: number): PixelMask {
    const total = w + flare * 2;
    return Array.from({ length: h }, (_, y) => {
        const grown = Math.max(0, Math.ceil((y - (h - flare * 2) + 1) / 2));
        const half = (w + grown * 2) / 2;
        return row(Array.from({ length: total }, (_, x) => Math.abs(x + 0.5 - total / 2) <= half));
    });
}

/** A few short grooves down the shaded side of a trunk. */
function grain(base: PixelMask, rng: () => number): PixelMask {
    const w = getMaskWidth(base);
    const cells = base.map((r) => [...r].map(() => false));
    for (let y = 1; y < base.length - 4; y += 3 + Math.floor(rng() * 2)) {
        const x = Math.floor(w / 2) + Math.floor(rng() * 2);
        for (let k = 0; k < 2 + Math.floor(rng() * 2); k += 1) if (base[y + k]?.[x] === "1") cells[y + k][x] = true;
    }
    return cells.map(row);
}

const cache = new Map<string, readonly ObjectPart[]>();

/** The parts of a fruit tree, trunk first, then the crown, its shading and the blossom or fruit. Each tree fills the 32×48 box, cached. */
export function fruitTreeParts(options?: FruitTreeOptions): readonly ObjectPart[] {
    const { stage, bearing, crop } = resolveFruitTree(options);
    const key = `${stage}:${bearing}:${crop}`;
    let parts = cache.get(key);
    if (parts) return parts;
    const look = looks[crop];
    const leaf = { ramp: look.leaf, seasonal: look.seasonal };
    const rng = seeded(`fruit_tree|${crop}|${stage}`);
    if (stage === "sapling") {
        parts = [
            { mask: fruitTreeSaplingStemMask, ramp: look.bark, x: 15, y: 39 },
            { mask: fruitTreeSaplingLeavesMask, ramp: look.leaf, seasonal: look.seasonal, x: 11, y: 35 }
        ];
    } else {
        const mature = stage === "mature";
        const scale = mature ? 1 : 0.55;
        const base = crowns[look.crown];
        const w = Math.round(base.w * scale);
        const h = Math.round(base.h * scale);
        const drawn = drawCrown(base.lobes.map(([cx, cy, r]) => [cx * scale, cy * scale, Math.max(2, r * scale)] as const), w, h, rng);
        const bottom = mature ? 34 : 39;
        const x = Math.floor((32 - w) / 2);
        const y = bottom - h;
        const stem = mature ? trunk(8, 17, 3) : trunk(4, 12, 1);
        const stemX = Math.floor((32 - getMaskWidth(stem)) / 2);
        parts = [
            { mask: stem, ramp: look.bark, x: stemX, y: 48 - stem.length },
            ...(mature ? [{ mask: grain(stem, rng), ramp: look.bark, tone: "shadow", x: stemX, y: 48 - stem.length } as const] : []),
            { mask: drawn.crown, ...leaf, x, y },
            { mask: drawn.shade, ...leaf, tone: "shadow", x, y },
            { mask: drawn.light, ...leaf, tone: "highlight", x, y },
            ...(bearing === "none" ? [] : [{ mask: spots(drawn, seeded(`spots|${crop}`), 8, bearing === "fruit" ? round : petals), ramp: bearing === "fruit" ? look.fruit : look.blossom, seasonal: { ash: null }, x, y } as const])
        ];
    }
    cache.set(key, parts);
    return parts;
}
