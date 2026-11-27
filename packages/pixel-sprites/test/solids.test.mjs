import assert from "node:assert/strict";
import test from "node:test";
import * as lib from "../dist/index.js";
import { OBJECT_FOOT, TILE_SIZE, buildMap, buildingBox, defineMap, doorBoxes, mapDrawables, solidBoxes, townTileset } from "../dist/index.js";

const config = { width: 6, storeys: 2, door: "centre" };
const map = defineMap(townTileset, Array(8).fill("gggggggg"), [{ id: "tree", x: 1, y: 1 }], [{ config, x: 3, y: 4 }]);
const box = buildingBox(config);

test("a building is solid where its wall is drawn: inset from its tiles, with the roof rows and the foot of the door open", () => {
    const walls = solidBoxes(map).filter((b) => b.height > TILE_SIZE);
    const left = walls.reduce((a, b) => (b.x < a.x ? b : a));
    const right = walls.reduce((a, b) => (b.x > a.x ? b : a));
    assert.equal(left.x, 3 * TILE_SIZE + 4, "the roof overhangs the wall by 4 px");
    assert.equal(right.x + right.width, (3 + 6) * TILE_SIZE - 4);
    const bottom = (4 + box.height) * TILE_SIZE;
    assert.equal(left.y + left.height, bottom, "down to the line it stands on");
    assert.ok(left.y > 4 * TILE_SIZE, "the roof rows above the wall are not solid");
    const [door] = doorBoxes(map);
    assert.deepEqual([door.width, door.height, door.y + door.height], [TILE_SIZE, TILE_SIZE, bottom]);
    const over = solidBoxes(map).find((b) => b.x === door.x && b.width === TILE_SIZE);
    assert.equal(over.y + over.height, door.y, "the wall over the door is solid");
    assert.ok(!solidBoxes(map).some((b) => b.x < door.x + door.width && door.x < b.x + b.width && b.y < door.y + door.height && door.y < b.y + b.height), "nothing solid on the door");
});

test("terrain is whole tiles, and a standing object is solid where it is drawn on its blocking cells", () => {
    // A tree blocks at its trunk only, and the trunk is narrower than the tile.
    const trunk = solidBoxes(map).find((b) => b.x >= 1 * TILE_SIZE && b.x < 2 * TILE_SIZE && b.y >= 2 * TILE_SIZE && b.y < 3 * TILE_SIZE);
    assert.ok(trunk.width < TILE_SIZE && trunk.height <= TILE_SIZE);
    assert.ok(trunk.x > 1 * TILE_SIZE && trunk.x + trunk.width < 2 * TILE_SIZE, "inside its tile, clear of both edges");
    assert.ok(!solidBoxes(map).some((b) => b.y < 2 * TILE_SIZE && b.y + b.height > 1 * TILE_SIZE && b.x < 2 * TILE_SIZE && b.x + b.width > TILE_SIZE), "the canopy is open");
    const wide = defineMap(townTileset, Array(4).fill("gggg"), [{ id: "counter", x: 2, y: 3 }]);
    const [counter] = solidBoxes(wide);
    assert.ok(counter.width > TILE_SIZE && counter.width <= 2 * TILE_SIZE, "two cells wide, as drawn");
});

test("the boxes are memoised per map", () => {
    assert.equal(solidBoxes(map), solidBoxes(map));
    assert.equal(doorBoxes(map), doorBoxes(map));
});

test("mapDrawables splits the map into the ground and what stands on it, back to front", () => {
    const { ground, standing } = mapDrawables(map, "summer");
    const whole = buildMap(map, "summer");
    assert.deepEqual([ground.width, ground.height], [whole.width, whole.height]);
    assert.equal(standing.length, 2, "the tree and the building");
    assert.deepEqual(standing.map((d) => d.sortY), [(1 + 2) * TILE_SIZE, (4 + box.height) * TILE_SIZE], "sorted by the row the footprint ends on");
    const building = standing[1];
    // Each raster is cropped to what is drawn, and sits where it is on the map, inside the building's box.
    assert.ok(building.x >= 3 * TILE_SIZE && building.x + building.raster.width <= (3 + 6) * TILE_SIZE);
    assert.ok(building.y >= 4 * TILE_SIZE && building.y + building.raster.height <= (4 + box.height) * TILE_SIZE);
    assert.equal(mapDrawables(map, "summer"), mapDrawables(map, "summer"), "memoised");
    assert.notEqual(mapDrawables(map, "winter"), mapDrawables(map, "summer"));
});

test("drawn in order, the ground and the drawables are the same picture as buildMap", () => {
    const { ground, standing } = mapDrawables(map, "autumn");
    const whole = buildMap(map, "autumn");
    const out = Array.from(ground.px, (i) => ground.colors[i]);
    for (const d of standing) {
        for (let y = 0; y < d.raster.height; y += 1) {
            for (let x = 0; x < d.raster.width; x += 1) {
                const color = d.raster.colors[d.raster.px[y * d.raster.width + x]];
                if (color) out[(d.y + y) * ground.width + d.x + x] = color;
            }
        }
    }
    assert.deepEqual(out, Array.from(whole.px, (i) => whole.colors[i]));
});

test("every standing object blocks only its foot, the same depth for all, so a mover can stand right behind one and be covered by it", () => {
    const { objectIds, objectInfo } = lib;
    for (const id of objectIds.filter((o) => objectInfo[o].layer === "standing" && objectInfo[o].footprint.join("").includes("#"))) {
        const { width, height } = objectInfo[id];
        const room = defineMap(townTileset, Array(8).fill("g".repeat(8)), [{ id, x: 4, y: 6 - height }]);
        const boxes = solidBoxes(room).filter((b) => b.x >= 4 * TILE_SIZE && b.x < (4 + width) * TILE_SIZE && b.y >= (6 - height) * TILE_SIZE && b.y < 6 * TILE_SIZE);
        assert.ok(boxes.length > 0, id);
        for (const box of boxes) assert.ok(box.height <= OBJECT_FOOT, `${id}: blocks ${box.height} px, no more than its foot (${OBJECT_FOOT})`);
    }
    // A counter, a till and a table are blocked from their back edge's depth to the foot, and drawn over a mover standing above that.
    for (const id of ["counter", "cash_register", "table"]) {
        const room = defineMap(townTileset, Array(4).fill("gggg"), [{ id, x: 2, y: 3 }]);
        const [box] = solidBoxes(room);
        assert.equal(box.height, OBJECT_FOOT, id);
        assert.equal(box.y + box.height, 3 * TILE_SIZE + TILE_SIZE, `${id}: down to the foot`);
        const { standing } = mapDrawables(room, "summer");
        assert.ok(box.y < standing[0].sortY, `${id}: a mover at the top of the box is above the sort line, so it is drawn first`);
    }
});

test("a room's thin walls block only their strip of the tile, and a tileset checks its solidArea", () => {
    const { houseTileset, defineTileSet, queryCell } = lib;
    const room = defineMap(houseTileset, ["hhhhhhhh", "lffffffr", "LFEGSFFR"], []);
    const boxes = solidBoxes(room);
    const at = (x, y) => boxes.filter((b) => b.x < (x + 1) * TILE_SIZE && b.x + b.width > x * TILE_SIZE && b.y < (y + 1) * TILE_SIZE && b.y + b.height > y * TILE_SIZE);
    assert.deepEqual(at(0, 2).map((b) => [b.x, b.width]), [[0, 8]], "the left wall is the left half of its tile");
    assert.deepEqual(at(15, 2).map((b) => [b.x, b.width]), [[15 * TILE_SIZE + 8, 8]], "and the right wall the right half");
    assert.deepEqual(at(4, 5).map((b) => [b.y, b.height]), [[5 * TILE_SIZE + 2, 14]], "the near wall starts 2 pixels into its tile");
    assert.equal(at(6, 5).length + at(7, 5).length, 0, "nothing blocks in the gap");
    assert.equal(queryCell(room, 0, 2).solid, true, "for tile movement the wall tile is solid");
    assert.equal(queryCell(room, 6, 5).solid, false);
    const blocks = { a: [["grass", "grass"], ["grass", "grass"]] };
    for (const area of [[[0, 0, 0, 4]], [[0, 0, 17, 4]], [[2, 2, 1, 4]], [[0.5, 0, 4, 4]], [[0, 0, 4]]]) assert.throws(() => defineTileSet({ id: "x", blocks, solidArea: { grass: area } }), /solidArea/);
    assert.throws(() => defineTileSet({ id: "x", blocks, solidArea: { nope: [[0, 0, 4, 4]] } }), /unknown tile/);
});
