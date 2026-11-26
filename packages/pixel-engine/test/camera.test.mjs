import assert from "node:assert/strict";
import test from "node:test";
import { cameraOrigin, createCamera } from "../dist/index.js";

const view = { width: 160, height: 144 };
const world = { width: 320, height: 288 };

test("the view centres on the target", () => {
    assert.deepEqual(cameraOrigin(view, world, 160, 144), { x: 80, y: 72 });
});

test("the view stops at every edge of the world", () => {
    assert.deepEqual(cameraOrigin(view, world, 0, 0), { x: 0, y: 0 });
    assert.deepEqual(cameraOrigin(view, world, 320, 288), { x: 160, y: 144 });
    assert.deepEqual(cameraOrigin(view, world, -500, 9999), { x: 0, y: 144 });
});

test("a world smaller than the view is centred, not pinned to a corner", () => {
    assert.deepEqual(cameraOrigin(view, { width: 100, height: 144 }, 50, 72), { x: -30, y: 0 });
    assert.deepEqual(cameraOrigin(view, { width: 159, height: 143 }, 0, 0), { x: -1, y: -1 }, "odd gaps round down");
});

test("the origin is always whole numbers", () => {
    for (const [px, py] of [[100.4, 50.6], [161.5, 143.5], [0.1, 0.9]]) {
        const { x, y } = cameraOrigin(view, world, px, py);
        assert.ok(Number.isInteger(x) && Number.isInteger(y), `${px},${py}`);
    }
});

test("a camera follows a target and re-fits when the world changes size", () => {
    const camera = createCamera(view, world);
    assert.deepEqual([camera.x, camera.y], [0, 0]);
    camera.follow(200, 100);
    assert.deepEqual([camera.x, camera.y], [120, 28]);
    camera.setBounds({ width: 160, height: 144 });
    assert.deepEqual([camera.x, camera.y], [0, 0]);
});

test("a view needs a size", () => {
    assert.throws(() => createCamera({ width: 0, height: 144 }, world), /positive/);
    assert.throws(() => createCamera({ width: 160, height: NaN }, world), /positive/);
});
