import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
    buildMap, buildObject, buildTile, defineMap, defineTileSet, solidBoxes, houseTileset, mapTileSize,
    colorRamps, colorableObjectIds, bushVegetables, produceLimits, cropIds, rootVegetables, treeCrops, treeStages, vegIds, vegetables, objectColors, objectIds, objectInfo, objectRamps, queryCell, seasonalObjectIds, tileAt, defaultTileTheme, tileSeasons, tileIds, tilePalettes, tileThemes, townTileset
} from "../dist/index.js";

test("every tile is 16×16, opaque terrain, and only uses palette colours", () => {
    assert.ok(tileIds.length >= 10);
    for (const id of tileIds) {
        const tile = buildTile(id);
        assert.equal(tile.width, 16, id);
        assert.equal(tile.height, 16, id);
        for (const color of tile.colors.slice(1)) assert.ok(Object.values(tilePalettes.summer).includes(color), `${id}: ${color}`);
    }
    for (const id of tileIds) assert.ok(buildTile(id).px.every((p) => p !== 0), `${id} is not opaque`);
});

const colorAt = (tile, x, y) => tile.colors[tile.px[y * tile.width + x]];
const sameIn = (a, b, xs, ys) => ys.every((y) => xs.every((x) => colorAt(a, x, y) === colorAt(b, x, y)));
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

test("edge tiles match their base pattern away from the edge", () => {
    const pavement = buildTile("beige_pavement");
    const inner = range(5, 10);
    for (const id of tileIds.filter((t) => t.startsWith("beige_pavement_"))) {
        const edge = buildTile(id);
        assert.ok(sameIn(edge, pavement, inner, inner), `${id} interior`);
        assert.ok(!sameIn(edge, pavement, range(0, 15), range(0, 15)), `${id} differs at its edge`);
    }
    // Only the open sides turn to grass: the top edge keeps its left, right and bottom rows.
    const top = buildTile("beige_pavement_top");
    assert.ok(sameIn(top, pavement, range(0, 15), range(5, 15)), "top edge keeps rows 5-15");
    assert.equal(colorAt(top, 8, 0), colorAt(buildTile("grass"), 8, 0), "top rows are grass");

    const wall = buildTile("wall");
    for (const id of ["wall_left", "wall_right", "wall_base", "wall_base_left", "wall_base_right"]) {
        assert.ok(sameIn(buildTile(id), wall, range(4, 11), range(4, 10)), `${id} interior`);
    }
});

test("roof pieces share the shingle pattern and differ at ridge, eave and edges", () => {
    const roof = buildTile("roof");
    const inner = range(3, 12);
    for (const id of tileIds.filter((t) => t.startsWith("roof_"))) {
        assert.ok(sameIn(buildTile(id), roof, inner, range(5, 11)), `${id} interior`);
    }
    assert.notDeepEqual(buildTile("roof_top").px, roof.px);
    assert.notDeepEqual(buildTile("roof_bottom").px, roof.px);
    assert.notDeepEqual(buildTile("roof_left").px, roof.px);
});

test("objects render at their footprint size using only fixed ramps", () => {
    const rampColors = new Set(Object.values(objectRamps).flatMap((r) => Object.values(r)));
    assert.deepEqual([...objectIds].sort(), ["bookshelf", "counter", "crop_beet", "crop_cabbage", "crop_carrot", "crop_corn", "crop_pumpkin", "crop_radish", "crop_tomato", "crop_turnip", "door", "fence", "flower", "fruit_apple", "fruit_cherry", "fruit_lemon", "fruit_olive", "fruit_orange", "fruit_peach", "fruit_pear", "fruit_tree", "rug", "tree", "veg_beet", "veg_cabbage", "veg_carrot", "veg_corn", "veg_pumpkin", "veg_radish", "veg_tomato", "veg_turnip", "window"]);
    for (const id of objectIds) {
        const { width, height, footprint } = objectInfo[id];
        assert.equal(footprint.length, height, id);
        assert.ok(footprint.every((row) => row.length === width && /^[#.]+$/.test(row)), id);
        const raster = buildObject(id);
        assert.equal(raster.width, width * 16, id);
        assert.equal(raster.height, height * 16, id);
        assert.ok(raster.px.some((p) => p !== 0), `${id} is empty`);
        for (const color of raster.colors.slice(1)) assert.ok(rampColors.has(color), `${id}: ${color}`);
    }
    assert.equal(buildObject("tree"), buildObject("tree"), "memoised");
});

const rows = ["gggg", "gtpw", "hhhh"];
const objects = [
    { id: "tree", x: 0, y: 0 },
    { id: "door", x: 5, y: 5 },
    { id: "window", x: 3, y: 5 },
    { id: "flower", x: 4, y: 3 },
    { id: "fence", x: 4, y: 3 }
];

test("defineMap and buildMap size the raster from blocks and tiles", () => {
    const map = defineMap(townTileset, rows, objects);
    assert.deepEqual(mapTileSize(map), { width: 8, height: 6 });
    const raster = buildMap(map);
    assert.equal(raster.width, 8 * 16);
    assert.equal(raster.height, 6 * 16);
    assert.equal(buildMap(map), raster, "memoised per map object");
});

test("objects are drawn over terrain", () => {
    const plain = buildMap(defineMap(townTileset, rows));
    const withObjects = buildMap(defineMap(townTileset, rows, objects));
    assert.notDeepEqual(withObjects.px, plain.px);
});

test("queryCell combines terrain and object behaviour", () => {
    const map = defineMap(townTileset, rows, objects);
    assert.equal(tileAt(map, 0, 0), "grass");
    assert.equal(queryCell(map, 0, 0).solid, false, "tree canopy tile is open");
    assert.equal(queryCell(map, 0, 1).solid, true, "tree trunk tile is solid");
    assert.equal(queryCell(map, 0, 1).object, "tree");
    assert.equal(queryCell(map, 2, 2).grass, true); // tall grass block
    assert.equal(queryCell(map, 6, 2).water, true);
    assert.equal(queryCell(map, 6, 2).solid, true);
    assert.equal(queryCell(map, 5, 5).door, true);
    assert.equal(queryCell(map, 5, 5).solid, true, "wall under the door is solid terrain");
    assert.equal(queryCell(map, 3, 5).solid, true);
    assert.equal(queryCell(map, 4, 3).object, "fence", "standing object wins over ground object");
    assert.equal(queryCell(map, 4, 3).solid, true);
    assert.equal(queryCell(map, -1, 0), undefined);
    assert.equal(queryCell(map, 8, 0), undefined);
    assert.equal(queryCell(map, 0, 6), undefined);
    assert.equal(queryCell(map, 0.5, 0), undefined);
});

test("the keypad blocks assemble a roof, a wall and a pavement patch", () => {
    const map = defineMap(townTileset, ["1223", "7889", "lhhr", "[__]", "ABBC", "DEEF", "GHHI"]);
    assert.equal(tileAt(map, 0, 0), "roof_top_left");
    assert.equal(tileAt(map, 7, 0), "roof_top_right");
    assert.equal(tileAt(map, 1, 1), "roof");
    assert.equal(tileAt(map, 0, 3), "roof_bottom_left");
    assert.equal(tileAt(map, 3, 3), "roof_bottom");
    assert.equal(tileAt(map, 0, 4), "wall_left");
    assert.equal(tileAt(map, 7, 5), "wall_right");
    assert.equal(tileAt(map, 2, 7), "wall_base");
    assert.equal(tileAt(map, 0, 7), "wall_base_left");
    assert.equal(tileAt(map, 7, 7), "wall_base_right");
    assert.equal(tileAt(map, 0, 8), "beige_pavement_top_left");
    assert.equal(tileAt(map, 3, 11), "beige_pavement");
    assert.equal(tileAt(map, 7, 13), "beige_pavement_bottom_right");
    assert.equal(queryCell(map, 2, 1).solid, true, "roofs are solid");
    assert.equal(queryCell(map, 2, 5).solid, true, "walls are solid");
    assert.equal(queryCell(map, 3, 11).solid, false, "pavement is walkable");
    assert.equal(queryCell(map, 0, 8).solid, false, "pavement corner is walkable");
});

test("a small house is one roof block over one wall block", () => {
    const map = defineMap(townTileset, ["<==>", "[__]"]);
    assert.deepEqual(mapTileSize(map), { width: 8, height: 4 });
    assert.equal(tileAt(map, 0, 0), "roof_top_left");
    assert.equal(tileAt(map, 1, 0), "roof_top");
    assert.equal(tileAt(map, 0, 1), "roof_bottom_left");
    assert.equal(tileAt(map, 3, 1), "roof_bottom");
    assert.equal(tileAt(map, 7, 0), "roof_top_right");
    assert.equal(tileAt(map, 7, 1), "roof_bottom_right");
    assert.equal(tileAt(map, 0, 2), "wall_left");
    assert.equal(tileAt(map, 0, 3), "wall_base_left");
    assert.equal(tileAt(map, 4, 3), "wall_base");
    assert.equal(queryCell(map, 3, 1).solid, true);
    assert.equal(queryCell(map, 3, 3).solid, true);
});

test("interior objects: counters, furniture and open rugs", () => {
    const map = defineMap(houseTileset, ["hhhh", "ffff", "ffff"], [
        { id: "counter", x: 1, y: 3 },
        { id: "bookshelf", x: 5, y: 2 },
        { id: "rug", x: 3, y: 4 },
        { id: "door", x: 3, y: 1 }
    ]);
    assert.equal(queryCell(map, 1, 3).counter, true);
    assert.equal(queryCell(map, 2, 3).counter, true, "counter spans two tiles");
    assert.equal(queryCell(map, 2, 3).solid, true);
    assert.equal(queryCell(map, 1, 4).solid, false, "floor in front of the counter");
    assert.equal(queryCell(map, 5, 3).solid, true, "second bookshelf tile");
    assert.equal(queryCell(map, 3, 4).solid, false, "rug is walkable");
    assert.equal(queryCell(map, 3, 4).object, "rug");
});

test("validation rejects bad input", () => {
    assert.throws(() => defineMap(townTileset, []), /at least one row/);
    assert.throws(() => defineMap(townTileset, ["gg", "g"]), /expected 2/);
    assert.throws(() => defineMap(townTileset, ["gz"]), /no block "z"/);
    assert.throws(() => defineMap(townTileset, ["gg"], [{ id: "nope", x: 0, y: 0 }]), /Unknown object/);
    assert.throws(() => defineMap(townTileset, ["gg"], [{ id: "tree", x: 0, y: 1 }]), /does not fit/);
    assert.throws(() => defineMap(townTileset, ["gg"], [{ id: "fence", x: 4, y: 0 }]), /does not fit/);
    assert.throws(() => defineMap(townTileset, ["gg"], [{ id: "fence", x: 0, y: 0 }, { id: "door", x: 0, y: 0 }]), /overlaps/);
    assert.throws(() => defineTileSet({ id: "x", blocks: { ab: [["grass", "grass"], ["grass", "grass"]] } }), /one character/);
    assert.throws(() => defineTileSet({ id: "x", blocks: { a: [["grass"]] } }), /2×2/);
    assert.throws(() => defineTileSet({ id: "x", blocks: { a: [["nope", "grass"], ["grass", "grass"]] } }), /unknown tile/);
    assert.throws(() => defineTileSet({ id: "x", blocks: {}, solid: ["nope"] }), /unknown tile/);
    assert.throws(() => defineTileSet({ id: "x", blocks: {}, blockSize: 0 }), /blockSize/);
});

// ─── Palettes and golden pixels ──────────────────────────────────────────────
const fingerprint = (r) => createHash("sha256").update(JSON.stringify([r.width, r.height, r.colors, [...r.px]])).digest("hex").slice(0, 16);

test("tiles match the recorded pixels in the summer (default) palette", () => {
    const golden = JSON.parse(readFileSync(new URL("./fixtures/tile-golden.json", import.meta.url), "utf8"));
    assert.deepEqual(Object.keys(golden).sort(), [...tileIds].sort());
    for (const id of tileIds) assert.equal(fingerprint(buildTile(id)), golden[id], id);
});

test("every palette names the same colours", () => {
    assert.deepEqual(tileThemes, ["spring", "summer", "autumn", "winter", "ash"]);
    assert.deepEqual([...tileSeasons], ["spring", "summer", "autumn", "winter"]);
    assert.equal(defaultTileTheme, "summer");
    const names = Object.keys(tilePalettes.summer).sort();
    for (const theme of tileThemes) {
        assert.deepEqual(Object.keys(tilePalettes[theme]).sort(), names, theme);
        for (const color of Object.values(tilePalettes[theme])) assert.match(color, /^#[0-9A-F]{6}$/i, theme);
    }
});

test("every season has its own grass and sky", () => {
    for (const key of ["grass", "water", "sky"]) {
        const values = tileThemes.map((theme) => tilePalettes[theme][key]);
        assert.equal(new Set(values).size, tileThemes.length, `${key} differs between seasons and ash`);
    }
});

test("a palette recolours tiles without changing their shape", () => {
    for (const theme of ["spring", "autumn", "winter"]) {
        let changed = 0;
        for (const id of tileIds) {
            const base = buildTile(id);
            const recoloured = buildTile(id, theme);
            assert.equal(recoloured.width, base.width, id);
            assert.equal(recoloured.height, base.height, id);
            // Each default colour maps to exactly one colour in the new palette.
            const seen = new Map();
            for (let i = 0; i < base.px.length; i += 1) {
                const from = base.colors[base.px[i]];
                const to = recoloured.colors[recoloured.px[i]];
                assert.equal(seen.get(from) ?? to, to, `${id}: ${from} maps to two colours in ${theme}`);
                seen.set(from, to);
            }
            if ([...seen].some(([from, to]) => from !== to)) changed += 1;
        }
        assert.ok(changed > 0, `${theme} changes some tiles`);
    }
    assert.notDeepEqual(buildTile("grass", "winter").colors, buildTile("grass").colors);
    assert.deepEqual(buildTile("road", "winter").colors, buildTile("road").colors, "road is not recoloured");
});

test("unknown palettes, and the old name \"default\", fall back to summer", () => {
    assert.equal(buildTile("grass", "summer"), buildTile("grass"));
    assert.equal(buildTile("grass", "default"), buildTile("grass"));
    assert.equal(buildTile("grass", "nope"), buildTile("grass"));
    assert.equal(buildTile("grass", "toString"), buildTile("grass"), "inherited keys are not palettes");
});

test("buildMap takes a palette, keeps objects' colours, and memoises per palette", () => {
    const map = defineMap(townTileset, ["ggg", "g1g"], [{ id: "tree", x: 0, y: 0 }]);
    const plain = buildMap(map);
    const winter = buildMap(map, "winter");
    assert.notEqual(winter, plain);
    assert.equal(buildMap(map, "winter"), winter);
    assert.equal(buildMap(map, "nope"), plain);
    assert.equal(winter.width, plain.width);
    assert.ok(winter.colors.includes(objectRamps.leaf_snow.base), "the tree is snowy in winter");
    assert.ok(!winter.colors.includes(objectRamps.leaf.base));
    assert.ok(plain.colors.includes(objectRamps.leaf.base), "and green in summer");
    assert.ok(winter.colors.includes(tilePalettes.winter.grass));
    assert.ok(!winter.colors.includes(tilePalettes.summer.grass));
});

test("the sky tile is a pale opaque tile that changes colour with the palette", () => {
    const sky = buildTile("sky");
    assert.equal(sky.width, 16);
    assert.equal(sky.height, 16);
    assert.ok(sky.px.every((p) => p !== 0), "sky is opaque");
    assert.equal(sky.colors.length, 3, "a base colour and a lighter speckle");
    for (const theme of ["spring", "autumn", "winter"]) {
        assert.notDeepEqual(buildTile("sky", theme).colors, sky.colors, `${theme} recolours the sky`);
    }
});

test("the town tileset has a sky block", () => {
    assert.deepEqual(townTileset.blocks.k, [["sky", "sky"], ["sky", "sky"]]);
});

test("trees and flowers change with the season, in the same shape, and the world follows", () => {
    assert.deepEqual([...seasonalObjectIds].sort(), ["flower", "fruit_tree", "tree"]);
    const shape = (r) => Array.from(r.px, (p) => (p === 0 ? 0 : 1)).join("");
    for (const id of seasonalObjectIds) {
        const summer = buildObject(id);
        assert.equal(buildObject(id, "summer"), summer, "summer is the default");
        assert.equal(buildObject(id, "nope"), summer, "unknown seasons fall back to summer");
        for (const season of ["spring", "autumn", "winter"]) {
            const other = buildObject(id, season);
            assert.notDeepEqual(other.colors, summer.colors, `${id} differs in ${season}`);
            assert.equal(shape(other), shape(summer), `${id} keeps its shape in ${season}`);
            assert.equal(buildObject(id, season), other, "memoised");
            const rampColors = new Set(Object.values(objectRamps).flatMap((r) => Object.values(r)));
            assert.ok(other.colors.slice(1).every((c) => rampColors.has(c)), `${id} ${season} uses fixed ramps`);
        }
    }
    for (const id of objectIds.filter((o) => !seasonalObjectIds.includes(o))) {
        assert.equal(buildObject(id, "winter"), buildObject(id), `${id} looks the same all year`);
    }
    const map = defineMap(townTileset, ["ggg", "g1g"], [{ id: "tree", x: 0, y: 0 }, { id: "flower", x: 3, y: 3 }]);
    assert.ok(buildMap(map, "autumn").colors.includes(objectRamps.leaf_autumn.base));
    assert.ok(buildMap(map, "spring").colors.includes(objectRamps.flower_pink.base));
    assert.ok(buildMap(map, "winter").colors.includes(objectRamps.flower_frost.base));
    assert.ok(buildMap(map).colors.includes(objectRamps.flower_red.base));
});

test("objects with a main colour can be shown in their common colours, in the same shape", () => {
    assert.deepEqual([...colorableObjectIds].sort(), ["bookshelf", "door", "fence", "flower", "rug", "tree", "window"]);
    const shape = (r) => Array.from(r.px, (p) => (p === 0 ? 0 : 1)).join("");
    for (const id of colorableObjectIds) {
        const plain = buildObject(id);
        for (const color of objectColors[id]) {
            const recoloured = buildObject(id, undefined, color);
            assert.equal(shape(recoloured), shape(plain), `${id} keeps its shape in ${color}`);
            assert.ok(Object.values(colorRamps[color]).some((c) => recoloured.colors.includes(c)), `${id} shows ${color}`);
            assert.equal(buildObject(id, undefined, color), recoloured, "memoised");
        }
    }
    assert.ok(buildObject("tree", "winter", "orange").colors.includes(colorRamps.orange.base), "a colour wins over the season");
    assert.ok(!buildObject("tree", "winter", "orange").colors.includes(objectRamps.leaf_snow.base));
    assert.ok(Object.values(objectRamps.gold).some((c) => buildObject("door", undefined, "blue").colors.includes(c)), "the knob keeps its colour");
});

test("colour is ignored for objects that cannot take it and for colours not offered for the object", () => {
    assert.equal(buildObject("counter", undefined, "red"), buildObject("counter"));
    assert.equal(buildObject("tree", undefined, "teal"), buildObject("tree"), "teal is not a tree colour");
    assert.equal(buildObject("flower", undefined, "plaid"), buildObject("flower"));
});

test("ash is a palette of its own: a drained, sooty city, with burnt trees and flowers, that is not one of the seasons", () => {
    assert.ok(tileThemes.includes("ash") && !tileSeasons.includes("ash"));
    for (const key of ["grass", "water", "sky", "pavementBase", "roadBase", "roof", "wall"]) assert.notEqual(tilePalettes.ash[key], tilePalettes.summer[key], key);
    // Everything in a map takes the palette, and so do the objects that change with the season.
    const map = defineMap(townTileset, ["gg", "gg"], [{ id: "tree", x: 0, y: 0 }, { id: "flower", x: 1, y: 1 }]);
    const ash = buildMap(map, "ash");
    assert.ok(ash.colors.includes(tilePalettes.ash.grass) && !ash.colors.includes(tilePalettes.summer.grass));
    assert.ok(ash.colors.includes(objectRamps.leaf_ash.base) && ash.colors.includes(objectRamps.flower_ash.base));
    assert.ok(!ash.colors.includes(objectRamps.leaf.base));
    assert.deepEqual([...seasonalObjectIds].sort(), ["flower", "fruit_tree", "tree"]);
});

test("the damaged ground tiles are their plain tiles with cracks, debris or soot, drawn in the palette's own names", () => {
    const grids = (id, theme) => [...buildTile(id, theme).px].map((i) => buildTile(id, theme).colors[i]);
    const crack = (theme) => tilePalettes[theme].crackLine;
    // A cracked road and pavement are the plain tile with crack pixels laid over it, so everything else stays where it was.
    for (const [damaged, plain] of [["cracked_road", "road"], ["cracked_pavement", "beige_pavement"], ["broken_floor", "floor"]]) {
        for (const theme of ["summer", "ash"]) {
            const a = grids(damaged, theme);
            const b = grids(plain, theme);
            const different = a.filter((c, i) => c !== b[i]);
            assert.ok(different.length >= 12, `${damaged} in ${theme} is visibly broken`);
            assert.ok(different.length < 100, `${damaged} in ${theme} is still the same tile`);
            assert.ok(a.includes(crack(theme)), `${damaged} has cracks in ${theme}`);
        }
    }
    // Scorched earth and rubble are ground of their own, in tones that are not the grass or the pavement's, and the war palette is darker.
    for (const id of ["scorched_earth", "rubble"]) {
        const colors = buildTile(id).colors.slice(1);
        assert.ok(colors.length >= 3, id);
        for (const key of ["grass", "pavementBase", "roadBase"]) assert.ok(!colors.includes(tilePalettes.summer[key]), `${id} is not ${key}`);
    }
    const luma = (hex) => [1, 3, 5].reduce((sum, i, k) => sum + parseInt(hex.slice(i, i + 2), 16) * [0.3, 0.59, 0.11][k], 0);
    assert.ok(luma(tilePalettes.ash.rubbleBase) < luma(tilePalettes.summer.rubbleBase));
    assert.ok(luma(tilePalettes.ash.scorchBase) < luma(tilePalettes.summer.scorchBase));
});

test("a street and a ruined block can be laid out from the tilesets, and none of the damaged ground blocks movement", () => {
    const map = defineMap(townTileset, ["NOQ", "LMJ", "KKK"]);
    assert.deepEqual([tileAt(map, 0, 0), tileAt(map, 2, 0), tileAt(map, 5, 0), tileAt(map, 5, 1)], ["scorched_earth", "rubble", "scorched_earth", "rubble"]);
    assert.equal(tileAt(map, 0, 2), "cracked_pavement");
    assert.equal(tileAt(map, 2, 2), "cracked_road");
    assert.equal(tileAt(map, 3, 2), "road");
    assert.equal(tileAt(map, 4, 2), "road");
    assert.equal(tileAt(map, 0, 4), "brick_pavement");
    for (let y = 0; y < 6; y += 1) for (let x = 0; x < 6; x += 1) assert.equal(queryCell(map, x, y).solid, false, `(${x}, ${y})`);
    for (const theme of tileThemes) assert.ok(buildMap(map, theme).width === 6 * 16, theme);
    const rooms = defineMap(houseTileset, ["bb", "ff"]);
    assert.equal(tileAt(rooms, 0, 0), "broken_floor");
    assert.equal(queryCell(rooms, 0, 0).solid, false);
});

test("a fruit tree fills 2×3 tiles at every stage, crop and season, and blocks the same cells", () => {
    assert.deepEqual(objectInfo.fruit_tree.footprint, ["..", "..", "##"]);
    for (const crop of treeCrops) {
        for (const stage of treeStages) {
            for (const season of [...tileSeasons, "ash"]) {
                const r = buildObject("fruit_tree", season, undefined, undefined, { stage, crop });
                assert.equal(r.width, 32, `${crop} ${stage}`);
                assert.equal(r.height, 48, `${crop} ${stage}`);
            }
        }
        assert.deepEqual(objectInfo[`fruit_${crop}`], { width: 1, height: 1, layer: "ground", footprint: ["."] });
        assert.equal(buildObject(`fruit_${crop}`).width, 16);
    }
});

test("a fruit tree grows: it gets bigger, then bears flowers, then fruit", () => {
    const count = (grow) => buildObject("fruit_tree", "summer", undefined, undefined, grow).px.filter(Boolean).length;
    const [sapling, young, mature] = treeStages.map((stage) => count({ stage, crop: "apple" }));
    assert.ok(sapling < young && young < mature);
    const colors = (grow, season = "summer") => new Set(buildObject("fruit_tree", season, undefined, undefined, grow).colors);
    assert.ok(!colors({ crop: "apple" }).has(objectRamps.fruit_red.outline));
    assert.ok(colors({ crop: "apple", bearing: "fruit" }).has(objectRamps.fruit_red.outline));
    assert.ok(colors({ crop: "apple", bearing: "flowers" }).has(objectRamps.flower_white.outline));
    assert.ok(colors({ crop: "cherry", bearing: "flowers" }).has(objectRamps.flower_pink.outline));
    // Nothing is borne before the tree is mature, or in a burnt city, and anything unknown becomes the default.
    assert.equal(count({ stage: "young", bearing: "fruit" }), count({ stage: "young" }));
    assert.ok(!colors({ crop: "apple", bearing: "fruit" }, "ash").has(objectRamps.fruit_red.outline));
    assert.equal(count({ stage: "huge", crop: "nope", bearing: "x" }), count({}));
});

test("a fruit tree can be placed with its options, and is damaged like a tree", () => {
    const map = defineMap(townTileset, Array(6).fill("gggggg"), [{ id: "fruit_tree", x: 1, y: 1, stage: "mature", bearing: "fruit", crop: "pear" }, { id: "fruit_pear", x: 4, y: 4 }]);
    assert.equal(queryCell(map, 1, 3).solid, true);
    assert.equal(queryCell(map, 1, 1).solid, false);
    assert.throws(() => defineMap(townTileset, Array(6).fill("gggggg"), [{ id: "fruit_tree", x: 0, y: 0, crop: "plum" }]), /crop/);
    assert.throws(() => defineMap(townTileset, Array(6).fill("gggggg"), [{ id: "fruit_tree", x: 0, y: 0, stage: "old" }]), /stage/);
    for (const damage of ["half", "ruin"]) {
        const r = buildObject("fruit_tree", "summer", undefined, damage, { crop: "olive" });
        assert.equal(r.height, 48);
        assert.ok(r.px.filter(Boolean).length < buildObject("fruit_tree", "summer", undefined, undefined, { crop: "olive" }).px.filter(Boolean).length);
    }
});

test("farmland tiles are the stages of working a field, and none of them blocks walking", () => {
    const stages = ["untilled", "tilled", "seeded", "sprouting"];
    for (const id of stages) {
        assert.ok(tileIds.includes(id), id);
        for (const theme of tileThemes) assert.ok(buildTile(id, theme).px.every((p) => p !== 0), `${id} ${theme} is opaque`);
    }
    const colours = (id) => new Set(buildTile(id).colors);
    // Each stage adds to the one before it: tilled soil, then seeds in it, then seedlings in it.
    assert.ok(colours("seeded").has(tilePalettes.summer.seed));
    assert.ok(!colours("tilled").has(tilePalettes.summer.seed));
    assert.ok(colours("sprouting").has(tilePalettes.summer.sprout));
    assert.ok(!colours("seeded").has(tilePalettes.summer.sprout));
    // A seedling stays green in winter, when the grass is white.
    assert.ok(buildTile("sprouting", "winter").colors.includes(tilePalettes.winter.sprout));
    const map = defineMap(townTileset, ["uvxy"], []);
    for (let x = 0; x < 8; x += 2) assert.equal(queryCell(map, x, 0).solid, false);
});

test("every vegetable is a crop in a field and a picked item, and root crops show only their top", () => {
    assert.equal(cropIds.length, vegetables.length);
    assert.equal(vegIds.length, vegetables.length);
    for (const v of vegetables) {
        assert.deepEqual(objectInfo[`veg_${v}`], { width: 1, height: 1, layer: "ground", footprint: ["."] }, v);
        const crop = buildObject(`crop_${v}`);
        assert.equal(crop.width, 16, v);
        assert.equal(crop.height, v === "corn" ? 32 : 16, v);
        assert.ok(crop.px.some(Boolean), v);
        assert.equal(objectInfo[`crop_${v}`].layer, "standing", v);
        assert.ok(objectInfo[`crop_${v}`].footprint.join("").includes("#"), `${v} blocks walking`);
        assert.equal(objectInfo[`veg_${v}`].footprint.join("").includes("#"), false, `a picked ${v} does not`);
    }
    const area = (id) => buildObject(id).px.filter(Boolean).length;
    for (const v of rootVegetables) assert.ok(area(`crop_${v}`) < area(`veg_${v}`) + 20, v);
    // A root vegetable in the ground shows less of itself than the picked one; a vegetable above the ground shows all of it.
    const body = (id, ramp) => buildObject(id).px.filter((i) => i && buildObject(id).colors[i] === objectRamps[ramp].base).length;
    assert.ok(body("crop_carrot", "veg_carrot") < body("veg_carrot", "veg_carrot"));
    assert.equal(body("crop_cabbage", "veg_cabbage"), body("veg_cabbage", "veg_cabbage"));
    assert.deepEqual(objectInfo.crop_corn.footprint, [".", "#"]);
});

test("a field is a map: soil tiles with crops on them, and picked vegetables on the ground", () => {
    const map = defineMap(townTileset, ["vvvv", "gggg"], [{ id: "crop_carrot", x: 0, y: 0 }, { id: "crop_corn", x: 2, y: 0 }, { id: "veg_beet", x: 4, y: 0 }]);
    const picture = buildMap(map);
    assert.equal(picture.width, 128);
    assert.equal(queryCell(map, 0, 0).solid, true, "a carrot blocks");
    assert.equal(queryCell(map, 2, 0).solid, false, "the top of a corn plant is open");
    assert.equal(queryCell(map, 2, 1).solid, true, "and its foot blocks");
    assert.equal(queryCell(map, 4, 0).solid, false, "a picked beet does not");
    // A crop blocks only where it is drawn: a cabbage fills most of its tile, a carrot far less.
    const widthOf = (id) => solidBoxes(defineMap(townTileset, ["gg"], [{ id, x: 0, y: 0 }])).reduce((sum, b) => sum + b.width, 0);
    assert.ok(widthOf("crop_carrot") < widthOf("crop_cabbage") && widthOf("crop_cabbage") <= 16);
    // It blocks only its foot, so a character can walk in behind the rest of the plant.
    for (const v of vegetables) {
        const [box] = solidBoxes(defineMap(townTileset, ["gg"], [{ id: `crop_${v}`, x: 0, y: 0 }]));
        assert.ok(box.height <= 4, `${v} blocks only its lowest ${box.height} px`);
    }
});

test("a bush crop can be bare: the plant stays when its tomatoes or cobs are picked", () => {
    assert.deepEqual([...bushVegetables], ["tomato", "corn"]);
    const count = (id, grow) => buildObject(id, "summer", undefined, undefined, grow).px.filter(Boolean).length;
    for (const v of bushVegetables) {
        const id = `crop_${v}`;
        const ripe = buildObject(id);
        const bare = buildObject(id, "summer", undefined, undefined, { bearing: "none" });
        assert.equal(bare.width, ripe.width, v);
        assert.equal(bare.height, ripe.height, v);
        assert.ok(count(id, { bearing: "none" }) > 0, `${v}: the plant is left`);
        assert.deepEqual([...buildObject(id, "summer", undefined, undefined, { bearing: "fruit" }).px], [...ripe.px], `${v}: anything else is ripe`);
        const produce = { tomato: objectRamps.fruit_red.outline, corn: objectRamps.veg_corn.outline }[v];
        assert.ok(ripe.colors.includes(produce) && !bare.colors.includes(produce), v);
    }
    // Crops that are taken whole have no bare form, and the bare plant still blocks.
    assert.deepEqual([...buildObject("crop_carrot", "summer", undefined, undefined, { bearing: "none" }).px], [...buildObject("crop_carrot").px]);
    const map = defineMap(townTileset, ["gg"], [{ id: "crop_tomato", x: 0, y: 0, bearing: "none" }]);
    assert.equal(queryCell(map, 0, 0).solid, true);
    for (const damage of ["half", "ruin"]) assert.ok(buildObject("crop_tomato", "summer", undefined, damage, { bearing: "none" }).px.some(Boolean), damage);
});

test("fruit and vegetables on a tree or a bush are counted, up to a limit, and more than that are not drawn", () => {
    assert.deepEqual(produceLimits, { fruit_tree: 8, crop_tomato: 4, crop_corn: 4 });
    const grid = (id, grow) => [...buildObject(id, "summer", undefined, undefined, grow).px].join();
    const colourCount = (id, grow, colour) => {
        const r = buildObject(id, "summer", undefined, undefined, grow);
        const index = r.colors.indexOf(colour);
        return index < 0 ? 0 : r.px.filter((p) => p === index).length;
    };
    // More fruit is more of the fruit's colour, one count at a time, until the limit.
    const tree = (count) => colourCount("fruit_tree", { bearing: "fruit", crop: "apple", count }, objectRamps.fruit_red.outline);
    assert.equal(tree(0), 0, "none");
    for (let n = 1; n <= 8; n += 1) assert.ok(tree(n) > tree(n - 1), `${n} apples show more than ${n - 1}`);
    assert.equal(grid("fruit_tree", { bearing: "fruit", count: 8 }), grid("fruit_tree", { bearing: "fruit" }), "the limit is the default");
    for (const over of [9, 50, Infinity]) assert.equal(grid("fruit_tree", { bearing: "fruit", count: over }), grid("fruit_tree", { bearing: "fruit", count: 8 }), `${over} is no more than 8`);
    assert.equal(grid("fruit_tree", { bearing: "fruit", count: -3 }), grid("fruit_tree", { bearing: "fruit", count: 0 }), "and less than none is none");
    assert.equal(grid("fruit_tree", { bearing: "fruit", count: 0 }), grid("fruit_tree", { bearing: "none" }), "0 is a bare tree");
    assert.equal(grid("fruit_tree", { bearing: "fruit", count: 2.9 }), grid("fruit_tree", { bearing: "fruit", count: 2 }), "whole fruit only");
    assert.equal(grid("fruit_tree", { bearing: "fruit", count: "many" }), grid("fruit_tree", { bearing: "fruit", count: 8 }), "anything else is the limit");
    // The same for a bush.
    for (const [v, ramp] of [["tomato", objectRamps.fruit_red], ["corn", objectRamps.veg_corn]]) {
        const bush = (count) => colourCount(`crop_${v}`, { count }, ramp.outline);
        assert.equal(bush(0), 0, `${v}: bare`);
        for (let n = 1; n <= 4; n += 1) assert.ok(bush(n) > bush(n - 1), `${v}: ${n}`);
        assert.equal(grid(`crop_${v}`, { count: 5 }), grid(`crop_${v}`), `${v}: more than the limit is the limit`);
        assert.equal(grid(`crop_${v}`, { count: 0 }), grid(`crop_${v}`, { bearing: "none" }), v);
    }
    // A placed object carries it, and it has to be a number.
    assert.doesNotThrow(() => defineMap(townTileset, ["gggg", "gggg"], [{ id: "crop_tomato", x: 0, y: 0, count: 2 }]));
    assert.throws(() => defineMap(townTileset, ["gggg", "gggg"], [{ id: "crop_tomato", x: 0, y: 0, count: "2" }]), /fruit/);
});
