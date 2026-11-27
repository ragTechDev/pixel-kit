import { buildingBox, defineMap, houseTileset, townTileset, type BuildingConfig, type ObjectDamage, type ObjectId, type PlacedObject, type Vegetable } from "@ragtechdev/pixel-sprites";

const at = (id: ObjectId, ...spots: [number, number][]): PlacedObject[] => spots.map(([x, y]) => ({ id, x, y }));

// An orchard of fruit trees at every stage, in the corner behind the house. Each is 2 by 3 tiles and blocks only its foot.
const orchard: PlacedObject[] = [
    { id: "fruit_tree", x: 0, y: 0, stage: "mature", bearing: "fruit", crop: "apple" },
    { id: "fruit_tree", x: 2, y: 0, stage: "mature", bearing: "flowers", crop: "cherry" },
    { id: "fruit_tree", x: 0, y: 3, stage: "mature", bearing: "fruit", crop: "orange", count: 5 },
    { id: "fruit_tree", x: 2, y: 3, stage: "young", crop: "pear" }
];

// A field beside the path. Its top rows are the soil stages (untilled, seeded, sprouting, as tiles), and the tilled rows below carry a
// vegetable each, as objects (a tomato or corn plant shows a `count` of what it carries, and the orange tree above too): the root vegetables show only their tops. A crop blocks only its base, so a character walks behind the leaves,
// and the empty tile at (3,12) is a way through between the tomatoes and the corn.
const crop = (veg: Vegetable, x: number, y: number, count?: number): PlacedObject => ({ id: `crop_${veg}`, x, y, ...(count === undefined ? {} : { count }) });
const field: PlacedObject[] = [
    ...(["carrot", "radish", "turnip", "beet", "cabbage", "pumpkin"] as const).map((veg, i) => crop(veg, i, 10)),
    crop("carrot", 0, 12), crop("tomato", 1, 12, 3), crop("tomato", 2, 12), crop("corn", 4, 12, 2), crop("corn", 5, 12)
];

// Terrain is one character per 2x2-tile block. Objects are placed in tile coordinates on top and shaded automatically.
export const townMap = defineMap(townTileset, [
    "gggggggggg",
    "gggggggggg",
    "gggggggggg",
    "gggpggggtt",
    "uxypgABCgt",
    "vvvpgDEFgt",
    "vvvpgGHIgt",
    "gggpsssssg",
    "gggpwwwwwg"
], [
    ...at("tree", [17, 0], [19, 0], [16, 10]),
    ...at("fence", [10, 6], [11, 6], [12, 6], [13, 6]),
    ...at("flower", [2, 7], [18, 2]),
    ...orchard,
    ...field
// The house is a building: its walls and roof are solid and the tile at the foot of its door is the way in.
], [{ config: { width: 8, roof: "gable", roofMaterial: "ceramic", windows: 2, chimney: "right" }, x: 4, y: 1 }]);

export const houseMap = defineMap(houseTileset, [
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
    ...at("door", [7, 11])
]);

// A street of buildings: each is drawn from fixed choices and placed in tile coordinates like an object.
export const streetMap = defineMap(townTileset, [
    "gggggggggggggg",
    "gggggggggggggg",
    "gggggggggggggg",
    "gggggggggggggg",
    "gggggggggggggg",
    "gggggggggggggg",
    "pppppppppppppp",
    "pppppppppppppp"
], [
    ...at("tree", [9, 10], [1, 3], [20, 4]),
    ...at("flower", [18, 11], [19, 10], [27, 9], [20, 10])
], [
    { config: { width: 6, roof: "hipFlat", depth: "long", roofMaterial: "ceramic", doorColor: "red", chimney: "right" }, x: 3, y: 5 },
    { config: { width: 7, storeys: 2, roof: "gable", pitch: "steep", depth: "medium", wall: "brick", roofMaterial: "wood", windowStyle: "shuttered", doorColor: "teal", door: "left", props: "barrels" }, x: 10, y: 3 },
    { config: { width: 5, roof: "flat", rooftop: "boxes", wall: "brick", wallColor: "yellow", roofColor: "grey", doorStyle: "arched", windowStyle: "arched", props: "planters", porch: "deck" }, x: 22, y: 6 }
]);

// A street after a war: scorched ground and rubble, a cracked road and pavement, buildings that are half or all gone, and burnt trees.
// Show it in the wartorn season. Each building stands with its foot on the row above the pavement.
const hurt = (id: ObjectId, damage: ObjectDamage, ...spots: [number, number][]): PlacedObject[] => spots.map(([x, y]) => ({ id, x, y, damage }));
const onStreet = (config: BuildingConfig, x: number) => ({ config, x, y: 10 - buildingBox(config).height });

export const ruinsMap = defineMap(townTileset, [
    "NNNNNNNNNNNNNN",
    "NNOQNNNNNQOQNN",
    "NNNNNNNNNNNNNN",
    "NQNNNNNNNNNNQN",
    "NNNNNNNOQNNNNN",
    "LLLLLLLLLLLLLL",
    "JJMJJJMJJJJMJJ",
    "KKKKKKKKKKKKKK"
], [
    ...hurt("tree", "ruin", [1, 2], [27, 7]),
    ...hurt("tree", "half", [13, 1]),
    ...hurt("fence", "ruin", [18, 8], [19, 8]),
    ...hurt("fence", "half", [8, 8]),
    ...hurt("flower", "ruin", [8, 3], [24, 2])
], [
    onStreet({ width: 6, roof: "hipFlat", wall: "brick", damage: "half" }, 2),
    onStreet({ width: 7, storeys: 2, roof: "gable", wall: "stone", damage: "ruin" }, 10),
    onStreet({ width: 5, roof: "flat", wall: "clapboard", damage: "half" }, 21)
]);

export const worlds = { Town: townMap, House: houseMap, Street: streetMap, Ruins: ruinsMap } as const;
export type WorldName = keyof typeof worlds;

/** A small town that fits in a card: a house, a path, a tree and some flowers (160x96 px). */
export const miniTown = defineMap(townTileset, [
    "ggggg",
    "ggggg",
    "ggpgg"
], [
    ...at("tree", [0, 2]),
    ...at("flower", [8, 4])
], [{ config: { width: 5, roof: "gable", roofMaterial: "ceramic", windows: 2 }, x: 2, y: 0 }]);
