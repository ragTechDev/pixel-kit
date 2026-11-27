import { defineMap, houseTileset, randomAvatar, type AvatarConfig, type ObjectId, type PlacedObject, type TileMap } from "@ragtechdev/pixel-sprites";
import type { Direction } from "@ragtechdev/pixel-engine";
import { townMap } from "../worlds";

const at = (id: ObjectId, ...spots: [number, number][]): PlacedObject[] => spots.map(([x, y]) => ({ id, x, y }));

/** The inside of the restaurant. A kitchen along the back wall, with a counter between it and the dining room. The far wall is seen face on, the side walls from above and the near wall at an angle, with a gap in it for the way out. */
export const restaurantMap = defineMap(houseTileset, [
    "hhhhhhhh",
    "lffffffr",
    "lffffffr",
    "lffffffr",
    "lffffffr",
    "LFEGSFFR"
], [
    ...at("window", [3, 1], [12, 1]),
    ...at("chalkboard", [6, 1], [9, 1]),
    // The kitchen: a fridge, then stoves and a sink along the wall, and a counter to prepare on.
    ...at("fridge", [1, 2]),
    ...at("stove", [4, 2], [6, 2]),
    ...at("sink", [5, 2]),
    ...at("counter", [8, 2]),
    // The pass between the kitchen and the dining room, with the till at the end. The kitchen is open at the right.
    ...at("counter", [1, 4], [3, 4], [5, 4], [7, 4]),
    ...at("cash_register", [9, 4]),
    // Four tables, each with a chair at either end.
    ...at("table", [2, 6], [11, 6], [2, 8], [11, 8]),
    ...at("chair", [1, 6], [4, 6], [10, 6], [13, 6], [1, 8], [4, 8], [10, 8], [13, 8]),
    ...at("rug", [7, 7])
]);

/** The inside of the grocer's: shelves and fridges along the back, a till behind a counter, and crates and shelves of goods to walk between. */
export const grocerMap = defineMap(houseTileset, [
    "hhhhhhhh",
    "lffffffr",
    "lffffffr",
    "lffffffr",
    "lffffffr",
    "LFEGSFFR"
], [
    ...at("window", [3, 1], [12, 1]),
    ...at("chalkboard", [7, 1]),
    ...at("grocery_shelf", [1, 2], [2, 2], [3, 2], [12, 2], [13, 2], [14, 2]),
    ...at("fridge", [5, 2], [9, 2]),
    // The checkout: a row of open floor runs between it and the fridges, so the shopkeeper's side can be walked, and there is a gap at the right end to step through.
    ...at("counter", [5, 5]),
    ...at("cash_register", [7, 5]),
    ...at("produce_crate", [2, 6], [3, 6], [4, 6], [11, 6], [12, 6], [13, 6]),
    ...at("grocery_shelf", [2, 8], [3, 8], [12, 8], [13, 8]),
    ...at("rug", [7, 7])
]);

export type PlaceId = "town" | "restaurant" | "grocer";

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
    /** Where the hero appears on the other side, when it is not that place's usual arrival: the town has two doors in. */
    readonly spawn?: Spawn;
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

/** The hero and the characters get a new random look each time the page loads. */
export const heroLook: AvatarConfig = randomAvatar();

export const places: Record<PlaceId, Place> = {
    town: {
        id: "town",
        map: townMap,
        npcs: [{ x: 9, y: 8, look: randomAvatar() }],
        arrive: { x: 7, y: 6, facing: "down" },
        exits: [{ x: 7, y: 5, to: "restaurant" }, { x: 12, y: 12, to: "grocer" }]
    },
    restaurant: {
        id: "restaurant",
        map: restaurantMap,
        // The cook at the stoves, and a waiter in the dining room.
        npcs: [{ x: 3, y: 3, look: randomAvatar() }, { x: 8, y: 5, look: randomAvatar() }],
        arrive: { x: 7, y: 10, facing: "up" },
        // The gap in the near wall, two tiles wide.
        exits: [{ x: 6, y: 11, to: "town" }, { x: 7, y: 11, to: "town" }]
    },
    grocer: {
        id: "grocer",
        map: grocerMap,
        // The grocer, behind the counter.
        npcs: [{ x: 7, y: 3, look: randomAvatar() }],
        arrive: { x: 7, y: 10, facing: "up" },
        // Out of the grocer's to the pavement in front of its door.
        exits: [{ x: 6, y: 11, to: "town", spawn: { x: 12, y: 13, facing: "down" } }, { x: 7, y: 11, to: "town", spawn: { x: 12, y: 13, facing: "down" } }]
    }
};

/** Where the hero starts: on the path, facing the viewer. */
export const start: { place: PlaceId; spawn: Spawn } = { place: "town", spawn: { x: 7, y: 8, facing: "down" } };
