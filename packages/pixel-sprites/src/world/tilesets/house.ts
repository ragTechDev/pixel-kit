import { defineTileSet } from "../tileset";

/**
 * Interior tileset: floor and walls. Block keys: f floor, h wall, b a floor broken up by a blast (cracks and debris in two corners).
 * Doors, windows, counters, rugs and bookshelves are objects placed on top.
 */
export const houseTileset = defineTileSet({
    id: "house",
    blocks: {
        f: [["floor", "floor"], ["floor", "floor"]],
        h: [["wall", "wall"], ["wall", "wall"]],
        b: [["broken_floor", "floor"], ["floor", "broken_floor"]]
    },
    solid: ["wall"]
});
