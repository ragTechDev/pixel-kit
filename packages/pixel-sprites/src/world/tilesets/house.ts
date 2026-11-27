import { defineTileSet } from "../tileset";

/**
 * Interior tileset: floor and walls. Block keys: f floor, h the far wall (two tiles tall, seen face on), b a floor broken up by a blast
 * (cracks and debris in two corners).
 *
 * A room in the usual pixel-art view has its far wall face on and the other walls thin, seen from above: `l` and `r` are a column of
 * floor with the left or right wall along it (use them for the rows between the far wall and the near one), and the bottom row is made of
 * `L` and `R` (the near wall with a corner), `F` (the near wall), `E` and `S` (its end on the right and on the left of a gap) and `G`
 * (a gap in the near wall: a doorway, with nothing in it). Only the thin part of each wall blocks movement (`solidArea`).
 * Doors, windows, counters, rugs and bookshelves are objects placed on top.
 */
export const houseTileset = defineTileSet({
    id: "house",
    blocks: {
        f: [["floor", "floor"], ["floor", "floor"]],
        h: [["wall", "wall"], ["wall", "wall"]],
        b: [["broken_floor", "floor"], ["floor", "broken_floor"]],
        l: [["room_wall_left", "floor"], ["room_wall_left", "floor"]],
        r: [["floor", "room_wall_right"], ["floor", "room_wall_right"]],
        L: [["room_wall_left", "floor"], ["room_wall_front_left", "room_wall_front"]],
        R: [["floor", "room_wall_right"], ["room_wall_front", "room_wall_front_right"]],
        F: [["floor", "floor"], ["room_wall_front", "room_wall_front"]],
        E: [["floor", "floor"], ["room_wall_front", "room_wall_front_end_right"]],
        S: [["floor", "floor"], ["room_wall_front_end_left", "room_wall_front"]],
        G: [["floor", "floor"], ["floor", "floor"]]
    },
    solid: ["wall", "room_wall_left", "room_wall_right", "room_wall_front", "room_wall_front_left", "room_wall_front_right", "room_wall_front_end_left", "room_wall_front_end_right"],
    solidArea: {
        room_wall_left: [[0, 0, 8, 16]],
        room_wall_right: [[8, 0, 16, 16]],
        room_wall_front: [[0, 2, 16, 16]],
        room_wall_front_left: [[0, 0, 8, 16], [0, 2, 16, 16]],
        room_wall_front_right: [[8, 0, 16, 16], [0, 2, 16, 16]],
        room_wall_front_end_left: [[0, 2, 16, 16]],
        room_wall_front_end_right: [[0, 2, 16, 16]]
    }
});
