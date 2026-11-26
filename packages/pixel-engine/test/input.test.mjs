import assert from "node:assert/strict";
import test from "node:test";
import { actions, createInput, directions, isAction } from "../dist/index.js";

test("the action set is fixed", () => {
    assert.deepEqual([...directions], ["up", "down", "left", "right"]);
    assert.deepEqual([...actions], ["up", "down", "left", "right", "a", "b", "start"]);
    assert.ok(isAction("a") && !isAction("fire") && !isAction(undefined) && !isAction(1));
});

test("press, hold and release", () => {
    const input = createInput();
    input.press("a");
    assert.ok(input.isDown("a") && input.wasPressed("a"));
    input.endFrame();
    assert.ok(input.isDown("a") && !input.wasPressed("a"), "held, but no longer a fresh press");
    input.release("a");
    assert.ok(!input.isDown("a"));
});

test("a held key does not count as a new press until it is released", () => {
    const input = createInput();
    input.press("a");
    input.endFrame();
    input.press("a");
    assert.ok(!input.wasPressed("a"));
    input.release("a");
    input.press("a");
    assert.ok(input.wasPressed("a"));
});

test("the direction pressed last wins, and releasing it returns to the one still held", () => {
    const input = createInput();
    assert.equal(input.heldDirection(), undefined);
    input.press("left");
    input.press("up");
    assert.equal(input.heldDirection(), "up");
    input.release("up");
    assert.equal(input.heldDirection(), "left");
    input.release("left");
    assert.equal(input.heldDirection(), undefined);
});

test("things that are not actions are ignored", () => {
    const input = createInput();
    input.press("fire");
    input.press("constructor");
    input.release("fire");
    assert.ok(!input.isDown("fire") && !input.isDown("constructor"));
    assert.equal(input.heldDirection(), undefined);
});

test("clear releases everything", () => {
    const input = createInput();
    input.press("a");
    input.press("right");
    input.clear();
    assert.ok(!input.isDown("a") && !input.isDown("right") && !input.wasPressed("a"));
    assert.equal(input.heldDirection(), undefined);
});
