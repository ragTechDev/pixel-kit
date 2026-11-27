import { defineMap, houseTileset, townTileset, type ObjectId, type PlacedObject } from "@ragtechdev/pixel-sprites";

const at = (id: ObjectId, ...spots: [number, number][]): PlacedObject[] => spots.map(([x, y]) => ({ id, x, y }));

// Terrain is one character per 2x2-tile block. Objects go on top, in tile coordinates, and are shaded for you.
// Change a letter or add an object and the map, and what blocks the hero, change with it.
export const town = defineMap(townTileset, [
    "gggggggggg",
    "gg<==>gggg",
    "gg[__]gggg",
    "gggpggggtt",
    "gggpgABCgt",
    "gggpgDEFgt",
    "gggpgGHIgt",
    "gggpsssssg",
    "gggpwwwwwg"
], [
    ...at("tree", [0, 0], [2, 0], [17, 0], [19, 0], [1, 8], [16, 10]),
    ...at("window", [5, 4], [10, 4]),
    ...at("door", [7, 5]),
    ...at("fence", [10, 6], [11, 6], [12, 6], [13, 6]),
    ...at("flower", [2, 7], [3, 10], [4, 13], [18, 2])
]);

// The inside of the house. The far wall is seen face on, the side walls from above and the near wall from above and a little in
// front (l, r, L, F, R). The gap in the near wall (G, with E and S at its ends) is the way out: there is no door, so
// stepping onto the gap goes back to the town.
export const house = defineMap(houseTileset, [
    "hhhhhhhh",
    "lffffffr",
    "lffffffr",
    "lffffffr",
    "lffffffr",
    "LFEGSFFR"
], [
    ...at("window", [3, 1], [11, 1]),
    ...at("bookshelf", [1, 2], [2, 2], [13, 2], [14, 2]),
    ...at("counter", [5, 4], [7, 4], [9, 4]),
    ...at("rug", [7, 7])
]);
