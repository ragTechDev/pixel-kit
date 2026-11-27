import assert from "node:assert/strict";
import test from "node:test";
import { defineMap, doorBoxes, solidBoxes, townTileset } from "@ragtechdev/pixel-sprites";
import { createMover, isOpen, overlaps } from "../dist/index.js";

const frame = 1 / 60;
const config = { width: 6, storeys: 2, door: "centre" };
// A building at tile (3, 4) on a grass map, with room on every side.
const map = defineMap(townTileset, Array(8).fill("gggggggg"), [], [{ config, x: 3, y: 4 }]);
const open = (box) => isOpen(map, box);
const run = (mover, direction, seconds, scale) => {
    for (let i = 0; i < Math.round(seconds / frame); i += 1) mover.step(frame, direction, open, scale);
};
// The three pieces of wall are the part left of the door, the part right of it and the part over it.
const walls = solidBoxes(map).filter((box) => box.height > 16);
const right = walls.reduce((a, b) => (b.x > a.x ? b : a));
const left = walls.reduce((a, b) => (b.x < a.x ? b : a));
const [door] = doorBoxes(map);
const at = (feetX, feetY, extra = {}) => createMover({ x: feetX - 3, y: feetY - 12, ...extra });

test("a building's wall is solid from its outline, not from the edge of its tiles, and its roof rows are open", () => {
    assert.equal(right.x + right.width, (3 + 6) * 16 - 4);
    assert.equal(left.x, 3 * 16 + 4);
    assert.equal(right.y % 16, 0);
    assert.ok(right.y > 4 * 16, "the roof rows above the wall are not solid");
    assert.equal(isOpen(map, { x: left.x + 10, y: 4 * 16 + 4, width: 10, height: 4 }), true);
});

test("a mover walks right up to the outline of a wall from the side and stops flush", () => {
    const mover = at(right.x + right.width + 30, right.y + 20);
    run(mover, "left", 2);
    assert.equal(mover.feet.x, right.x + right.width);
    assert.equal(mover.facing, "left");
    mover.step(frame, "left", open);
    assert.equal(mover.moving, false);
});

test("a mover comes up to the foot of a wall from the front, and in from the left", () => {
    const front = at(right.x + 20, right.y + right.height + 30);
    run(front, "up", 2);
    assert.equal(front.feet.y, right.y + right.height);
    const side = at(left.x - 40, left.y + 20);
    run(side, "right", 2);
    assert.equal(side.feet.x + side.feet.width, left.x);
});

test("a mover walks behind a building through the roof rows and stops at the top of its wall", () => {
    const mover = at(right.x + 20, 4 * 16 - 8);
    run(mover, "down", 3);
    assert.equal(mover.feet.y + mover.feet.height, right.y);
    assert.ok(mover.y < right.y, "its cell is above the wall, behind the roof");
});

test("the foot of the door is open, the wall over it is not, and a door does not need lining up to the pixel", () => {
    const aligned = at(door.x + 3, door.y + door.height + 30);
    run(aligned, "up", 3);
    assert.ok(overlaps(aligned.feet, door));
    assert.equal(aligned.feet.y, door.y);
    // Three pixels into the wall on the left: it is nudged over rather than stopped.
    const off = at(door.x - 3, door.y + door.height + 30, { assist: 4 });
    run(off, "up", 3);
    assert.ok(overlaps(off.feet, door));
    // By default there is no nudge, and it stops under the wall.
    const stuck = at(door.x - 3, door.y + door.height + 30);
    run(stuck, "up", 3);
    assert.equal(stuck.feet.y, door.y + door.height);
});

test("the edge of the map stops a mover, and so does anything passed as also", () => {
    const mover = at(10, 20);
    run(mover, "left", 2);
    assert.equal(mover.feet.x, 0);
    run(mover, "up", 2);
    assert.equal(mover.feet.y, 0);
    const wall = { x: 30, y: 0, width: 16, height: 40 };
    const blocked = at(70, 10);
    for (let i = 0; i < 120; i += 1) blocked.step(frame, "left", (box) => isOpen(map, box, [wall]));
    assert.equal(blocked.feet.x, 46);
});

test("speed is pixels a second, running is a multiple of it, and null stands still", () => {
    const walk = at(20, 30);
    run(walk, "right", 1);
    assert.ok(Math.abs(walk.x - (17 + 64)) <= 1);
    const fast = at(20, 30);
    run(fast, "right", 1, 2);
    assert.ok(Math.abs(fast.x - (17 + 128)) <= 1);
    const still = at(20, 30);
    still.step(frame, null, open);
    assert.deepEqual([still.x, still.moving], [17, false]);
    assert.equal(createMover({ x: 0, y: 0, speed: 32 }).step(frame, null, open), undefined);
});

test("ahead is in front of the feet, teleport places it, and bad numbers throw", () => {
    const mover = at(20, 30);
    mover.step(frame, "up", open);
    const { x, y } = mover.ahead(10);
    assert.equal(x, mover.feet.x + 5);
    assert.equal(y, mover.feet.y + 2 - 10);
    mover.teleport(5, 6, "right");
    assert.deepEqual([mover.x, mover.y, mover.facing], [5, 6, "right"]);
    assert.throws(() => mover.teleport(1.5, 2));
    assert.throws(() => createMover({ x: 0.5, y: 0 }));
    assert.throws(() => createMover({ x: 0, y: 0, speed: 0 }));
    assert.throws(() => createMover({ x: 0, y: 0, assist: -1 }));
});
