import type { IconId, ObjectId, TileId } from "@ragtechdev/pixel-sprites";

export const idLabel = (id: string) => id.replaceAll("_", " ");

/** Ground a war has been over, kept together so it is easy to find. */
const damagedTiles = new Set<string>(["cracked_road", "cracked_pavement", "scorched_earth", "rubble", "broken_floor"]);

/** Tiles come in families (a nine-patch roof, pavement, wall); everything else is plain terrain. */
export function tileGroup(id: TileId): string {
    if (id.startsWith("roof")) return "Roofs";
    if (id.startsWith("beige_pavement")) return "Pavement";
    if (id.startsWith("wall")) return "Walls";
    if (damagedTiles.has(id)) return "Damaged";
    return "Terrain";
}
export const tileGroups = ["Terrain", "Pavement", "Roofs", "Walls", "Damaged"] as const;

export const objectLabel: Record<ObjectId, string> = {
    tree: "Tree", fence: "Fence", door: "Door", window: "Window",
    counter: "Counter", bookshelf: "Bookshelf", rug: "Rug", flower: "Flowers"
};
export const categoryLabel = (c: string) => c.replaceAll("-", " & ");
export type { IconId };
