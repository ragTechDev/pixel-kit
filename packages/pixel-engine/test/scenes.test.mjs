import assert from "node:assert/strict";
import test from "node:test";
import { createScenes } from "../dist/index.js";

const scene = (name, log) => ({
    enter: () => log.push(`enter ${name}`),
    exit: () => log.push(`exit ${name}`),
    update() {},
    render() {}
});

test("push and pop call enter and exit, and only the top scene is current", () => {
    const log = [];
    const scenes = createScenes();
    assert.equal(scenes.current, undefined);
    assert.equal(scenes.size, 0);
    const a = scene("a", log);
    const b = scene("b", log);
    scenes.push(a);
    scenes.push(b);
    assert.equal(scenes.current, b);
    assert.equal(scenes.size, 2);
    assert.equal(scenes.pop(), b);
    assert.equal(scenes.current, a);
    assert.deepEqual(log, ["enter a", "enter b", "exit b"]);
});

test("replace exits the old scene and enters the new one without changing the depth", () => {
    const log = [];
    const scenes = createScenes();
    scenes.push(scene("a", log));
    scenes.replace(scene("b", log));
    assert.equal(scenes.size, 1);
    assert.deepEqual(log, ["enter a", "exit a", "enter b"]);
});

test("popping an empty stack is harmless, and enter and exit are optional", () => {
    const scenes = createScenes();
    assert.equal(scenes.pop(), undefined);
    scenes.push({ update() {}, render() {} });
    scenes.replace({ update() {}, render() {} });
    assert.equal(scenes.size, 1);
});
