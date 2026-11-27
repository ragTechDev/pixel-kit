import assert from "node:assert/strict";
import test from "node:test";
import { buildMap, buildObject, defineMap, objectDamage, objectIds, objectInfo, objectRamps, queryCell, solidBoxes, townTileset } from "../dist/index.js";

// Pixel values index each raster's own colour list, so compare the colours themselves.
const paint = (r) => [...r.px].map((i) => r.colors[i]);
const solid = (r) => [...r.px].filter((i) => i !== 0).length;

test("every object can be damaged, the same way each time, and keeps its size and its place on the ground", () => {
    assert.deepEqual([...objectDamage], ["none", "half", "ruin"]);
    for (const id of objectIds) {
        const whole = buildObject(id);
        for (const damage of ["half", "ruin"]) {
            const hurt = buildObject(id, undefined, undefined, damage);
            const label = `${id} ${damage}`;
            assert.equal(hurt.width, whole.width, label);
            assert.equal(hurt.height, whole.height, label);
            assert.notDeepEqual(paint(hurt), paint(whole), label);
            assert.deepEqual(paint(buildObject(id, undefined, undefined, damage)), paint(hurt), label);
            assert.ok(hurt.colors.length <= 256, label);
            assert.ok(solid(hurt) > 0, `${label}: something is left`);
            assert.ok(solid(hurt) < solid(whole), `${label}: parts are gone`);
        }
        // A ruin is more gone than a half, and the damage is chosen from the list: anything else is the object as made.
        assert.ok(solid(buildObject(id, undefined, undefined, "ruin")) < solid(buildObject(id, undefined, undefined, "half")), id);
        assert.deepEqual(paint(buildObject(id, undefined, undefined, "none")), paint(whole), id);
        assert.deepEqual(paint(buildObject(id, undefined, undefined, "burnt")), paint(whole), id);
    }
});

test("damage keeps an object's season and colour", () => {
    assert.notDeepEqual(paint(buildObject("tree", "summer", undefined, "half")), paint(buildObject("tree", "autumn", undefined, "half")));
    assert.notDeepEqual(paint(buildObject("door", undefined, "red", "ruin")), paint(buildObject("door", undefined, "blue", "ruin")));
    assert.ok(buildObject("door", undefined, "#e8873a", "half").colors.some((c) => c && c !== ""));
});

test("a damaged object on a map blocks and warps exactly where the whole one did", () => {
    const rows = Array(6).fill("gggggg");
    const whole = defineMap(townTileset, rows, objectIds.map((id, i) => ({ id, x: (i % 3) * 2, y: Math.floor(i / 3) * 2 })).filter((p) => p.x + objectInfo[p.id].width <= 6 && p.y + objectInfo[p.id].height <= 6));
    const hurt = defineMap(townTileset, rows, whole.objects.map((o, i) => ({ ...o, damage: i % 2 ? "ruin" : "half" })));
    for (let y = 0; y < 6; y += 1) {
        for (let x = 0; x < 6; x += 1) {
            const [a, b] = [queryCell(whole, x, y), queryCell(hurt, x, y)];
            assert.deepEqual([b.solid, b.door, b.counter], [a.solid, a.door, a.counter], `(${x}, ${y})`);
        }
    }
    assert.deepEqual(solidBoxes(hurt), solidBoxes(whole));
    assert.notDeepEqual(paint(buildMap(hurt)), paint(buildMap(whole)));
    assert.throws(() => defineMap(townTileset, rows, [{ id: "tree", x: 1, y: 1, damage: "burnt" }]), /cannot be damaged/);
});

test("a damaged standing object never has a piece hanging in the air: everything is joined to its foot", () => {
    const colors = ["red", "blue", "green", "orange", "pink", "purple", "yellow", "teal", "white", "grey"];
    const loose = (r, foot) => {
        const on = (x, y) => x >= 0 && y >= 0 && x < r.width && y < r.height && r.px[y * r.width + x] !== 0;
        const seen = new Set();
        const queue = [];
        for (let y = foot - 2; y < r.height; y += 1) for (let x = 0; x < r.width; x += 1) if (on(x, y)) { seen.add(y * r.width + x); queue.push([x, y]); }
        for (let i = 0; i < queue.length; i += 1) {
            const [x, y] = queue[i];
            for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
                if (on(x + dx, y + dy) && !seen.has((y + dy) * r.width + x + dx)) { seen.add((y + dy) * r.width + x + dx); queue.push([x + dx, y + dy]); }
            }
        }
        return [...r.px].filter((p, k) => p !== 0 && !seen.has(k)).length;
    };
    for (const id of objectIds.filter((i) => objectInfo[i].layer === "standing")) {
        const whole = buildObject(id);
        let foot = whole.height - 1;
        while (foot > 0 && [...whole.px.slice(foot * whole.width, (foot + 1) * whole.width)].every((p) => p === 0)) foot -= 1;
        // Many seeds: the colour and the season each seed the damage differently.
        for (const season of ["spring", "summer", "autumn", "winter", "ash"]) {
            for (const color of [undefined, ...colors]) {
                for (const damage of ["half", "ruin"]) {
                    assert.equal(loose(buildObject(id, season, color, damage), foot), 0, `${id} ${season} ${color} ${damage}`);
                }
            }
        }
    }
});

test("a half-damaged tree is its trunk with bare limbs and clumps of leaves that are on them, not a ball of leaves on a stick", () => {
    const whole = buildObject("tree");
    const countLeaves = (r) => [...r.px].filter((p, k) => p !== 0 && Math.floor(k / r.width) < 12).length;
    for (const season of ["spring", "summer", "autumn", "winter", "ash"]) {
        const hurt = buildObject("tree", season, undefined, "half");
        // Most of the canopy is gone, but not all of it, and the limbs show where the leaves were.
        assert.ok(countLeaves(hurt) < countLeaves(whole) * 0.7, season);
        assert.ok(countLeaves(hurt) > 20, season);
        assert.ok(hurt.colors.includes(objectRamps.bark.base) && hurt.colors.includes(objectRamps.bark.shadow), `${season}: limbs are bark`);
    }
});
