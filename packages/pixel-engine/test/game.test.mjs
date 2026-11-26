import assert from "node:assert/strict";
import test from "node:test";
import { createGame, createInput } from "../dist/index.js";

const frames = (game, count) => {
    for (let i = 0; i < count; i += 1) game.advance(1 / 60);
};

test("the game runs the current scene once per step", () => {
    let updates = 0;
    const game = createGame({ scene: { update: () => (updates += 1), render() {} } });
    assert.equal(game.advance(0.1), 6);
    frames(game, 60);
    assert.equal(updates, 66);
});

test("a scene can be built from the game, so it can use the input and the scene stack", () => {
    let seen;
    const game = createGame({
        scene: (g) => {
            seen = g;
            return { update() {}, render() {} };
        }
    });
    assert.equal(seen, game);
    assert.equal(game.scenes.size, 1);
});

test("a fresh press is visible to one update only, even when a frame runs two", () => {
    const seen = [];
    const game = createGame({
        scene: (g) => ({ update: () => seen.push(g.input.wasPressed("a")), render() {} })
    });
    game.input.press("a");
    game.advance(2 / 60);
    assert.deepEqual(seen, [true, false]);
});

test("a press waits for the next update when a frame runs none", () => {
    const seen = [];
    const game = createGame({ scene: (g) => ({ update: () => seen.push(g.input.wasPressed("a")), render() {} }), step: 0.1 });
    game.input.press("a");
    game.advance(0.01);
    assert.deepEqual(seen, []);
    game.advance(0.1);
    assert.deepEqual(seen, [true]);
});

test("render passes the context and how far the clock is into the next step", () => {
    const calls = [];
    const game = createGame({ scene: { update() {}, render: (ctx, alpha) => calls.push([ctx, alpha]) }, step: 0.1 });
    game.advance(0.15);
    game.render("ctx");
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], "ctx");
    assert.ok(Math.abs(calls[0][1] - 0.5) < 1e-6);
});

test("changing scenes in an update takes effect for the next one", () => {
    const log = [];
    const second = { update: () => log.push("second"), render() {} };
    const game = createGame({ scene: (g) => ({ update: () => (log.push("first"), g.scenes.replace(second)), render() {} }) });
    frames(game, 2);
    assert.deepEqual(log, ["first", "second"]);
});

test("an input can be supplied, and nothing runs without a scene on the stack", () => {
    const input = createInput();
    const game = createGame({ input, scene: { update() {}, render() {} } });
    assert.equal(game.input, input);
    game.scenes.pop();
    assert.equal(game.advance(0.1), 6);
    game.render("ctx");
});

test("a quick tap on a direction still moves a walker one tile", async () => {
    const { createWalker } = await import("../dist/index.js");
    const hero = createWalker({ x: 0, y: 0 });
    const game = createGame({
        scene: (g) => ({
            update(dt) {
                const direction = g.input.heldDirection();
                if (direction) hero.walk(direction, () => true);
                hero.update(dt);
            },
            render() {}
        })
    });
    game.input.press("right");
    game.input.release("right"); // a touch lifted before the next update
    for (let i = 0; i < 20; i += 1) game.advance(1 / 60);
    assert.deepEqual([hero.tx, hero.ty], [1, 0], "one tile, not zero and not a run");
});
