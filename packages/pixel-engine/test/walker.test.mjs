import assert from "node:assert/strict";
import test from "node:test";
import { defineMap, queryCell, townTileset } from "@ragtechdev/pixel-sprites";
import { createWalker, isWalkable, neighbor } from "../dist/index.js";

const open = () => true;
const shut = () => false;
const run = (walker, seconds) => {
    let arrived = 0;
    for (let i = 0; i < Math.round(seconds * 60); i += 1) if (walker.update(1 / 60)) arrived += 1;
    return arrived;
};

test("neighbor steps one tile in each direction", () => {
    assert.deepEqual(neighbor(5, 5, "up"), { x: 5, y: 4 });
    assert.deepEqual(neighbor(5, 5, "down"), { x: 5, y: 6 });
    assert.deepEqual(neighbor(5, 5, "left"), { x: 4, y: 5 });
    assert.deepEqual(neighbor(5, 5, "right"), { x: 6, y: 5 });
});

test("a walker starts still, on a tile, in pixel positions", () => {
    const walker = createWalker({ x: 2, y: 3 });
    assert.deepEqual([walker.tx, walker.ty, walker.x, walker.y, walker.moving, walker.facing], [2, 3, 32, 48, false, "down"]);
});

test("a step takes a quarter of a second at the default speed, and arrival is reported once", () => {
    const walker = createWalker({ x: 0, y: 0 });
    assert.equal(walker.walk("right", open), "moved");
    assert.ok(walker.moving);
    let updates = 0;
    while (!walker.update(1 / 60)) updates += 1;
    assert.equal(updates + 1, 15, "15 updates of 1/60 s");
    assert.deepEqual([walker.tx, walker.ty, walker.x, walker.y, walker.moving], [1, 0, 16, 0, false]);
    assert.equal(walker.update(1 / 60), false, "no second arrival");
});

test("the pixel position glides between tiles in whole pixels", () => {
    const walker = createWalker({ x: 0, y: 0 });
    walker.walk("right", open);
    walker.update(0.125);
    assert.deepEqual([walker.x, walker.y, walker.tx], [8, 0, 0]);
    const down = createWalker({ x: 0, y: 1 });
    down.walk("up", open);
    down.update(0.125);
    assert.deepEqual([down.x, down.y], [0, 8]);
    for (let i = 0; i < 20; i += 1) {
        walker.update(0.01);
        assert.ok(Number.isInteger(walker.x));
    }
});

test("speed is tiles per second", () => {
    const walker = createWalker({ x: 0, y: 0, speed: 8 });
    walker.walk("down", open);
    assert.equal(run(walker, 0.125), 1);
    assert.equal(walker.ty, 1);
});

test("a blocked step only turns the walker", () => {
    const walker = createWalker({ x: 0, y: 0, facing: "down" });
    assert.equal(walker.walk("left", shut), "blocked");
    assert.deepEqual([walker.facing, walker.moving, walker.tx, walker.x], ["left", false, 0, 0]);
});

test("a walker already stepping is busy and keeps its direction", () => {
    const walker = createWalker({ x: 0, y: 0 });
    walker.walk("right", open);
    assert.equal(walker.walk("up", open), "busy");
    assert.equal(walker.facing, "right");
    run(walker, 0.3);
    assert.deepEqual([walker.tx, walker.ty], [1, 0]);
});

test("canEnter is asked about the tile ahead", () => {
    const asked = [];
    const walker = createWalker({ x: 4, y: 4 });
    walker.walk("up", (x, y) => (asked.push([x, y]), true));
    assert.deepEqual(asked, [[4, 3]]);
});

test("teleport ends a step at once, and a bad tile or speed is refused", () => {
    const walker = createWalker({ x: 0, y: 0 });
    walker.walk("right", open);
    walker.update(0.1);
    walker.teleport(7, 2, "left");
    assert.deepEqual([walker.tx, walker.ty, walker.x, walker.y, walker.moving, walker.facing], [7, 2, 112, 32, false, "left"]);
    assert.throws(() => walker.teleport(1.5, 0), /whole tile/);
    assert.throws(() => createWalker({ x: 0.5, y: 0 }), /whole tile/);
    for (const speed of [0, -1, NaN, Infinity]) assert.throws(() => createWalker({ x: 0, y: 0, speed }), /speed/, String(speed));
});

// A 4x4-tile world: grass at the top left and bottom, water at the top right, and a tree
// whose canopy is open and whose trunk blocks.
const map = defineMap(townTileset, ["gw", "gg"], [{ id: "tree", x: 0, y: 0 }]);

test("isWalkable reads the library's terrain and object footprints", () => {
    assert.equal(isWalkable(map, 1, 0), true, "grass");
    assert.equal(isWalkable(map, 0, 0), true, "a tree's canopy is open");
    assert.equal(isWalkable(map, 0, 1), false, "a tree's trunk blocks");
    assert.equal(isWalkable(map, 2, 0), false, "water is solid");
    assert.equal(isWalkable(map, -1, 0), false, "off the map");
    assert.equal(isWalkable(map, 4, 0), false, "off the map");
    assert.equal(isWalkable(map, 1.5, 0), false, "not a tile");
});

test("a walker stops at water and at a tree trunk on a real map", () => {
    const canEnter = (x, y) => isWalkable(map, x, y);
    const toWater = createWalker({ x: 1, y: 0 });
    assert.equal(toWater.walk("right", canEnter), "blocked");
    assert.equal(toWater.facing, "right");
    const toTrunk = createWalker({ x: 1, y: 1 });
    assert.equal(toTrunk.walk("left", canEnter), "blocked");
    assert.equal(createWalker({ x: 1, y: 1 }).walk("down", canEnter), "moved");
});

// A door in a house wall sits on a solid wall tile. Without the option it blocks like the rest of the wall.
const house = defineMap(
    townTileset,
    ["gggggggggg", "gg<==>gggg", "gg[__]gggg", "gggpgggggg"],
    [{ id: "door", x: 7, y: 5 }, { id: "tree", x: 0, y: 0 }]
);

test("a door in a wall is walkable only when doors are asked for", () => {
    assert.equal(isWalkable(house, 7, 5), false, "the wall tile under the door is solid");
    assert.equal(isWalkable(house, 7, 5, { doors: true }), true);
    assert.equal(isWalkable(house, 7, 5, { doors: false }), false);
    assert.equal(isWalkable(house, 6, 5, { doors: true }), false, "the rest of the wall still blocks");
    assert.equal(isWalkable(house, 0, 1, { doors: true }), false, "and so does a tree trunk");
    assert.equal(isWalkable(house, -1, 5, { doors: true }), false, "off the map is never open");
    assert.equal(queryCell(house, 7, 5).door, true);
});

test("a walker steps onto a door and the arrival is the moment to warp", () => {
    const walker = createWalker({ x: 7, y: 6, facing: "up" });
    const canEnter = (x, y) => isWalkable(house, x, y, { doors: true });
    assert.equal(walker.walk("up", canEnter), "moved");
    let arrived = false;
    for (let i = 0; i < 20 && !arrived; i += 1) arrived = walker.update(1 / 60);
    assert.ok(arrived);
    assert.equal(queryCell(house, walker.tx, walker.ty).door, true);
    assert.equal(walker.walk("up", canEnter), "blocked", "and the wall behind the door still blocks");
});
