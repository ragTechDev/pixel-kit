import assert from "node:assert/strict";
import test from "node:test";
import { buildMap, buildObject, defineMap, objectDamage, objectIds, objectInfo, queryCell, solidBoxes, townTileset } from "../dist/index.js";

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
