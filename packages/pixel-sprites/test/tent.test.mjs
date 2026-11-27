import assert from "node:assert/strict";
import test from "node:test";
import { TILE_SIZE, buildTent, tentBox, tentDamage, tentFootprint, tentSizes, tentStyles, resolveTentConfig } from "../dist/index.js";

const paint = (r) => [...r.px].map((i) => r.colors[i]);

test("every style, size and damage draws a whole number of tiles with the ground row painted and the corners clear", () => {
    for (const style of tentStyles) for (const size of tentSizes) for (const damage of tentDamage) {
        const config = { style, size, damage };
        const r = buildTent(config);
        const box = tentBox(config);
        assert.equal(r.width, box.width * TILE_SIZE, JSON.stringify(config));
        assert.equal(r.height, box.height * TILE_SIZE, JSON.stringify(config));
        assert.ok(paint(r).slice(-r.width).some((c) => c !== ""), JSON.stringify(config));
        assert.equal(r.px[0], 0);
        assert.equal(r.px[r.width - 1], 0);
        assert.ok(r.colors.length > 5, JSON.stringify(config));
    }
});

test("a tent is repeatable and a different choice is a different picture", () => {
    assert.deepEqual(paint(buildTent({ style: "dome" })), paint(buildTent({ style: "dome" })));
    assert.notDeepEqual(paint(buildTent({ style: "dome" })), paint(buildTent({ style: "ridge" })));
    assert.notDeepEqual(paint(buildTent({ damage: "ruin" })), paint(buildTent()));
});

test("colours: a common colour and a hex colour work, anything else falls back", () => {
    assert.equal(resolveTentConfig({ color: "blue" }).color, "blue");
    assert.equal(resolveTentConfig({ color: "#E83" }).color, "#ee8833");
    assert.equal(resolveTentConfig({ color: "javascript:alert(1)" }).color, "canvas");
    assert.equal(resolveTentConfig({ style: "x", size: 9, damage: "y" }).size, 4);
    assert.ok(buildTent({ color: "#336699" }).colors.includes("#336699"));
});

test("the footprint is solid with the doorway at the foot of the middle column", () => {
    for (const size of tentSizes) {
        const rows = tentFootprint({ size });
        assert.equal(rows.length, size - 1);
        assert.ok(rows.every((r) => r.length === size));
        assert.equal(rows.join("").split("D").length - 1, 1);
        assert.equal(rows[rows.length - 1][Math.floor(size / 2)], "D");
    }
});

test("a placed tent blocks walking, has a doorway, covers what is behind it and is checked by defineMap", async () => {
    const { defineMap, townTileset, queryCell, solidBoxes, doorBoxes, mapDrawables, buildMap } = await import("../dist/index.js");
    const rows = ["gggg", "gggg", "gggg"];
    const map = defineMap(townTileset, rows, [], [], [{ config: { size: 4, style: "dome" }, x: 1, y: 1 }]);
    assert.equal(map.tents.length, 1);
    assert.equal(queryCell(map, 1, 1).solid, true);
    assert.equal(queryCell(map, 1, 1).tent, map.tents[0]);
    const door = queryCell(map, 3, 3);
    assert.equal(door.door, true);
    assert.equal(door.solid, false);
    assert.deepEqual(doorBoxes(map), [{ x: 3 * TILE_SIZE, y: 3 * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }]);
    const covers = (x, y) => solidBoxes(map).some((b) => x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height);
    assert.ok(covers(1 * TILE_SIZE + 2, 2 * TILE_SIZE));
    assert.ok(covers(2 * TILE_SIZE, 3 * TILE_SIZE + 4));
    assert.ok(!covers(3 * TILE_SIZE + 2, 3 * TILE_SIZE + 4));
    assert.equal(mapDrawables(map).standing.length, 1);
    assert.equal(buildMap(map).width, 8 * TILE_SIZE);
    assert.throws(() => defineMap(townTileset, rows, [], [], [{ x: 6, y: 0 }]), /does not fit/);
    assert.throws(() => defineMap(townTileset, rows, [], [], [{ x: 0, y: 0 }, { x: 2, y: 1 }]), /overlaps/);
});
