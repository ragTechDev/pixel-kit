import assert from "node:assert/strict";
import test from "node:test";
import { createLoop } from "../dist/index.js";

const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-6, `${message ?? ""} expected ${a} to be near ${b}`);

test("sixty advances of 1/60 s are sixty updates, with no drift", () => {
    let updates = 0;
    const loop = createLoop({ update: () => (updates += 1) });
    for (let i = 0; i < 600; i += 1) loop.advance(1 / 60);
    assert.equal(updates, 600);
});

test("update gets the step length, and a long frame runs several steps", () => {
    const seen = [];
    const loop = createLoop({ update: (dt) => seen.push(dt), step: 0.05 });
    const result = loop.advance(0.12);
    assert.equal(result.steps, 2);
    assert.deepEqual(seen, [0.05, 0.05]);
    close(result.alpha, 0.4, "alpha");
});

test("leftover time carries to the next advance", () => {
    let updates = 0;
    const loop = createLoop({ update: () => (updates += 1), step: 0.1 });
    assert.equal(loop.advance(0.06).steps, 0);
    assert.equal(loop.advance(0.06).steps, 1);
    assert.equal(updates, 1);
});

test("a stalled tab catches up on at most maxFrame", () => {
    let updates = 0;
    const loop = createLoop({ update: () => (updates += 1), step: 1 / 60, maxFrame: 0.25 });
    assert.equal(loop.advance(60).steps, 15);
    assert.equal(updates, 15);
});

test("negative, NaN and infinite time is ignored", () => {
    let updates = 0;
    const loop = createLoop({ update: () => (updates += 1) });
    for (const bad of [-1, NaN, Infinity, -Infinity]) assert.equal(loop.advance(bad).steps, 0, String(bad));
    assert.equal(updates, 0);
});

test("reset forgets carried time", () => {
    const loop = createLoop({ update() {}, step: 0.1 });
    loop.advance(0.09);
    loop.reset();
    assert.equal(loop.advance(0.02).steps, 0);
});

test("a bad step or maxFrame throws", () => {
    for (const step of [0, -1, NaN, Infinity]) assert.throws(() => createLoop({ update() {}, step }), /step/, String(step));
    assert.throws(() => createLoop({ update() {}, step: 0.1, maxFrame: 0.05 }), /maxFrame/);
});
