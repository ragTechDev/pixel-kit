import { defineMap, houseTileset, randomAvatar, type AvatarConfig, type ObjectId, type PlacedObject, type TileMap } from "@ragtechdev/pixel-sprites";
import type { Direction } from "@ragtechdev/pixel-engine";
import { townMap } from "../worlds";

const at = (id: ObjectId, ...spots: [number, number][]): PlacedObject[] => spots.map(([x, y]) => ({ id, x, y }));

/** The inside of a house. Its door is one row up from the bottom edge, so the floor in front of it can be reached. */
export const interiorMap = defineMap(houseTileset, [
    "hhhhhhhh",
    "ffffffff",
    "ffffffff",
    "ffffffff",
    "ffffffff",
    "hhhhhhhh"
], [
    ...at("window", [3, 1], [11, 1]),
    ...at("bookshelf", [1, 2], [2, 2], [13, 2], [14, 2]),
    ...at("counter", [5, 4], [7, 4], [9, 4]),
    ...at("rug", [7, 7]),
    ...at("door", [7, 10])
]);

export type PlaceId = "town" | "interior";

export interface Spawn {
    /** Tile coordinates. */
    readonly x: number;
    readonly y: number;
    readonly facing: Direction;
}

/** A door: stepping onto the tile at (x, y) leads to another place. */
export interface Exit {
    readonly x: number;
    readonly y: number;
    readonly to: PlaceId;
}

/** A character who stands still, is drawn with the hero and blocks the way. */
export interface Npc {
    readonly x: number;
    readonly y: number;
    readonly look: AvatarConfig;
}

export interface Place {
    readonly id: PlaceId;
    readonly map: TileMap;
    readonly npcs: readonly Npc[];
    /** Where the hero appears when arriving through a door. */
    readonly arrive: Spawn;
    readonly exits: readonly Exit[];
}

/** The hero and the two characters get a new random look each time the page loads. */
export const heroLook: AvatarConfig = randomAvatar();

export const places: Record<PlaceId, Place> = {
    town: {
        id: "town",
        map: townMap,
        npcs: [{ x: 9, y: 8, look: randomAvatar() }],
        arrive: { x: 7, y: 6, facing: "down" },
        exits: [{ x: 7, y: 5, to: "interior" }]
    },
    interior: {
        id: "interior",
        map: interiorMap,
        npcs: [{ x: 3, y: 6, look: randomAvatar() }],
        arrive: { x: 7, y: 9, facing: "up" },
        exits: [{ x: 7, y: 10, to: "town" }]
    }
};

/** Where the hero starts: on the path, facing the house. */
export const start: { place: PlaceId; spawn: Spawn } = { place: "town", spawn: { x: 7, y: 8, facing: "up" } };
