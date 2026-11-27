/** Road and pavement tiles (`src/world/masks/tiles`). */
export type RoadTileId = "road" | "beige_pavement" | "brick_pavement" | "cracked_road" | "cracked_pavement";

/** Terrain tiles for towns and interiors (`src/world/masks/tiles`). */
export type TownTileId =
    | "grass" | "tall_grass" | "path" | "water" | "shore" | "wall" | "floor" | "sky"
    // Ground that a war has been over: burnt earth, a field of rubble, and a floor broken up.
    | "scorched_earth" | "rubble" | "broken_floor"
    // Roof nine-patch: ridge (top), eave (bottom), rake edges (left, right).
    | "roof_top_left" | "roof_top" | "roof_top_right"
    | "roof_left" | "roof" | "roof_right"
    | "roof_bottom_left" | "roof_bottom" | "roof_bottom_right"
    // Beige pavement edges against grass. The centre is `beige_pavement`.
    | "beige_pavement_top" | "beige_pavement_bottom" | "beige_pavement_left" | "beige_pavement_right"
    | "beige_pavement_top_left" | "beige_pavement_top_right"
    | "beige_pavement_bottom_left" | "beige_pavement_bottom_right"
    // House wall edges. The roof's eave covers the top of a wall.
    | "wall_left" | "wall_right" | "wall_base" | "wall_base_left" | "wall_base_right";

export type TileId = RoadTileId | TownTileId;

/** The crops of a fruit tree. */
export type TreeCrop = "apple" | "cherry" | "peach" | "pear" | "orange" | "lemon" | "olive";

/** Picked fruit, one object per crop. */
export type FruitId = `fruit_${TreeCrop}`;

/** Things that stand on or sit over the terrain. They are shaded sprites, not tiles. */
export type ObjectId = "tree" | "fruit_tree" | FruitId | "fence" | "door" | "window" | "counter" | "bookshelf" | "rug" | "flower";
