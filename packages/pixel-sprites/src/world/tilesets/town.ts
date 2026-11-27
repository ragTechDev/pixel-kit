import { defineTileSet } from "../tileset";

/**
 * Outdoor tileset: grass, paths, water, pavement, building walls and roofs.
 *
 * Block keys:
 * - `g` grass, `t` tall grass, `p` path, `w` water, `s` shore (shore row over a water row), `k` sky
 * - `1`-`9` roof, laid out like a phone keypad:
 *     1 2 3   ridge, with corners
 *     4 5 6   middle
 *     7 8 9   eave, with corners
 * - `<` `=` `>` a roof one block high (ridge over eave: left, middle, right), for small houses
 * - `A`-`I` beige pavement, in the same keypad layout (`E` is the middle,
 *   the rest are edges and corners against grass)
 * - `l` `h` `r` wall (left edge, middle, right edge)
 * - `[` `_` `]` wall one block high with its foundation row (left corner, middle, right corner)
 * - `J` road, `K` brick pavement
 * - after a war: `L` cracked pavement, `M` cracked road (each with a cracked tile in two corners of the block, so a street
 *   looks broken without repeating), `N` scorched earth, `O` rubble, `Q` rubble lying in scorched earth. None of them blocks movement.
 *
 * - farmland, in the order it is worked: `u` untilled, `v` tilled, `x` seeded, `y` sprouting seedlings. Crops stand on it as objects.
 *
 * Trees, fences, flowers, doors and windows are objects placed on top.
 */
export const townTileset = defineTileSet({
    id: "town",
    blocks: {
        g: [["grass", "grass"], ["grass", "grass"]],
        t: [["tall_grass", "tall_grass"], ["tall_grass", "tall_grass"]],
        p: [["path", "path"], ["path", "path"]],
        w: [["water", "water"], ["water", "water"]],
        s: [["shore", "shore"], ["water", "water"]],
        k: [["sky", "sky"], ["sky", "sky"]],

        "1": [["roof_top_left", "roof_top"], ["roof_left", "roof"]],
        "2": [["roof_top", "roof_top"], ["roof", "roof"]],
        "3": [["roof_top", "roof_top_right"], ["roof", "roof_right"]],
        "4": [["roof_left", "roof"], ["roof_left", "roof"]],
        "5": [["roof", "roof"], ["roof", "roof"]],
        "6": [["roof", "roof_right"], ["roof", "roof_right"]],
        "7": [["roof_left", "roof"], ["roof_bottom_left", "roof_bottom"]],
        "8": [["roof", "roof"], ["roof_bottom", "roof_bottom"]],
        "9": [["roof", "roof_right"], ["roof_bottom", "roof_bottom_right"]],

        "<": [["roof_top_left", "roof_top"], ["roof_bottom_left", "roof_bottom"]],
        "=": [["roof_top", "roof_top"], ["roof_bottom", "roof_bottom"]],
        ">": [["roof_top", "roof_top_right"], ["roof_bottom", "roof_bottom_right"]],

        A: [["beige_pavement_top_left", "beige_pavement_top"], ["beige_pavement_left", "beige_pavement"]],
        B: [["beige_pavement_top", "beige_pavement_top"], ["beige_pavement", "beige_pavement"]],
        C: [["beige_pavement_top", "beige_pavement_top_right"], ["beige_pavement", "beige_pavement_right"]],
        D: [["beige_pavement_left", "beige_pavement"], ["beige_pavement_left", "beige_pavement"]],
        E: [["beige_pavement", "beige_pavement"], ["beige_pavement", "beige_pavement"]],
        F: [["beige_pavement", "beige_pavement_right"], ["beige_pavement", "beige_pavement_right"]],
        G: [["beige_pavement_left", "beige_pavement"], ["beige_pavement_bottom_left", "beige_pavement_bottom"]],
        H: [["beige_pavement", "beige_pavement"], ["beige_pavement_bottom", "beige_pavement_bottom"]],
        I: [["beige_pavement", "beige_pavement_right"], ["beige_pavement_bottom", "beige_pavement_bottom_right"]],

        l: [["wall_left", "wall"], ["wall_left", "wall"]],
        h: [["wall", "wall"], ["wall", "wall"]],
        r: [["wall", "wall_right"], ["wall", "wall_right"]],
        "[": [["wall_left", "wall"], ["wall_base_left", "wall_base"]],
        _: [["wall", "wall"], ["wall_base", "wall_base"]],
        "]": [["wall", "wall_right"], ["wall_base", "wall_base_right"]],

        J: [["road", "road"], ["road", "road"]],
        K: [["brick_pavement", "brick_pavement"], ["brick_pavement", "brick_pavement"]],

        L: [["cracked_pavement", "beige_pavement"], ["beige_pavement", "cracked_pavement"]],
        M: [["cracked_road", "road"], ["road", "cracked_road"]],
        N: [["scorched_earth", "scorched_earth"], ["scorched_earth", "scorched_earth"]],
        O: [["rubble", "rubble"], ["rubble", "rubble"]],
        Q: [["rubble", "scorched_earth"], ["scorched_earth", "rubble"]],

        u: [["untilled", "untilled"], ["untilled", "untilled"]],
        v: [["tilled", "tilled"], ["tilled", "tilled"]],
        x: [["seeded", "seeded"], ["seeded", "seeded"]],
        y: [["sprouting", "sprouting"], ["sprouting", "sprouting"]]
    },
    solid: [
        "water", "wall", "wall_left", "wall_right", "wall_base", "wall_base_left", "wall_base_right",
        "roof_top_left", "roof_top", "roof_top_right", "roof_left", "roof", "roof_right",
        "roof_bottom_left", "roof_bottom", "roof_bottom_right"
    ],
    water: ["water"],
    grass: ["tall_grass"]
});
