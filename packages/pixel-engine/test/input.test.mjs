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
    input.endFrame(); // an update has run, so both are held, not taps
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

test("a tap shorter than one update still counts for that update", () => {
    const input = createInput();
    input.press("left");
    input.release("left"); // the key was up again before the game ran
    assert.ok(input.wasPressed("left"));
    assert.ok(input.isDown("left"), "still down for the update that has not run yet");
    assert.equal(input.heldDirection(), "left");
    input.endFrame();
    assert.ok(!input.isDown("left") && !input.wasPressed("left"), "and gone after it");
    assert.equal(input.heldDirection(), undefined);
});

test("a tap does not stick when the key is pressed again before the update", () => {
    const input = createInput();
    input.press("a");
    input.release("a");
    input.press("a"); // pressed again: it is held now
    input.endFrame();
    assert.ok(input.isDown("a"), "still held after the update");
    input.release("a");
    assert.ok(!input.isDown("a"));
});

test("a tap and a held direction resolve to the one pressed last, then fall back", () => {
    const input = createInput();
    input.press("left");
    input.endFrame();
    input.press("up");
    input.release("up");
    assert.equal(input.heldDirection(), "up", "the tap is the newest");
    input.endFrame();
    assert.equal(input.heldDirection(), "left", "and the held key is back after it");
});

test("clear drops a tap that has not been seen", () => {
    const input = createInput();
    input.press("left");
    input.release("left");
    input.clear();
    assert.ok(!input.isDown("left") && !input.wasPressed("left"));
    input.endFrame();
    input.press("left"); // a fresh press after clear behaves normally
    assert.ok(input.isDown("left"));
});
