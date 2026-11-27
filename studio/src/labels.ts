import type { IconId, ObjectId, TileId } from "@ragtechdev/pixel-sprites";

export const idLabel = (id: string) => id.replaceAll("_", " ");

/** Ground a war has been over, kept together so it is easy to find. */
/** The stages of working a field, in order. */
const farmTiles = new Set<string>(["untilled", "tilled", "seeded", "sprouting"]);

const damagedTiles = new Set<string>(["cracked_road", "cracked_pavement", "scorched_earth", "rubble", "broken_floor"]);

/** Tiles come in families (a nine-patch roof, pavement, wall); everything else is plain terrain. */
export function tileGroup(id: TileId): string {
    if (id.startsWith("roof")) return "Roofs";
    if (id.startsWith("beige_pavement")) return "Pavement";
    if (id.startsWith("wall")) return "Walls";
    if (farmTiles.has(id)) return "Farmland";
    if (damagedTiles.has(id)) return "Damaged";
    return "Terrain";
}
export const tileGroups = ["Terrain", "Pavement", "Roofs", "Walls", "Farmland", "Damaged"] as const;

export const objectLabel: Record<ObjectId, string> = {
    tree: "Tree", fruit_tree: "Fruit tree", fence: "Fence", door: "Door", window: "Window",
    counter: "Counter", bookshelf: "Bookshelf", rug: "Rug", flower: "Flowers",
    crop_carrot: "Carrot plant", crop_radish: "Radish plant", crop_turnip: "Turnip plant", crop_beet: "Beet plant", crop_cabbage: "Cabbage plant", crop_pumpkin: "Pumpkin plant", crop_tomato: "Tomato plant", crop_corn: "Corn plant",
    veg_carrot: "Carrot", veg_radish: "Radish", veg_turnip: "Turnip", veg_beet: "Beet", veg_cabbage: "Cabbage", veg_pumpkin: "Pumpkin", veg_tomato: "Tomato", veg_corn: "Corn",
    fruit_apple: "Apple", fruit_cherry: "Cherries", fruit_peach: "Peach", fruit_pear: "Pear", fruit_orange: "Orange", fruit_lemon: "Lemon", fruit_olive: "Olive"
};
/** The objects library is grouped by what an object is for, not by how it is drawn. */
export const objectGroups = ["home", "plants", "crops", "produce"] as const;
export type ObjectGroup = (typeof objectGroups)[number];
const objectGroupLabels: Record<ObjectGroup, string> = { home: "Home & town", plants: "Trees & flowers", crops: "Crops in a field", produce: "Picked produce" };
export const objectGroupLabel = (g: string) => objectGroupLabels[g as ObjectGroup] ?? g;
export function objectGroup(id: ObjectId): ObjectGroup {
    if (id.startsWith("crop_")) return "crops";
    if (id.startsWith("veg_") || (id.startsWith("fruit_") && id !== "fruit_tree")) return "produce";
    if (id === "tree" || id === "fruit_tree" || id === "flower") return "plants";
    return "home";
}

export const categoryLabel = (c: string) => c.replaceAll("-", " & ");
export type { IconId };
