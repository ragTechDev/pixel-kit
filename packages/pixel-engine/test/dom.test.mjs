import assert from "node:assert/strict";
import test from "node:test";
import { createGame, createInput } from "../dist/index.js";
import { attachKeyboard, defaultKeymap, start } from "../dist/dom.js";

const key = (type, code, extra = {}) => Object.assign(new Event(type, { cancelable: true }), { code }, extra);

test("the default keymap only maps to real actions", async () => {
    const { isAction } = await import("../dist/index.js");
    for (const [code, action] of Object.entries(defaultKeymap)) assert.ok(isAction(action), `${code} -> ${action}`);
});

test("keys on the target drive the input, and mapped keys do not scroll the page", () => {
    const target = new EventTarget();
    const input = createInput();
    attachKeyboard(target, input);
    const down = key("keydown", "ArrowLeft");
    target.dispatchEvent(down);
    assert.ok(input.isDown("left") && input.wasPressed("left"));
    assert.ok(down.defaultPrevented);
    const up = key("keyup", "ArrowLeft");
    target.dispatchEvent(up);
    assert.ok(!input.isDown("left"));
    assert.ok(up.defaultPrevented);
});

test("other keys and browser shortcuts are left alone", () => {
    const target = new EventTarget();
    const input = createInput();
    attachKeyboard(target, input);
    const other = key("keydown", "KeyQ");
    target.dispatchEvent(other);
    assert.ok(!other.defaultPrevented);
    for (const modifier of ["ctrlKey", "metaKey", "altKey"]) {
        const shortcut = key("keydown", "KeyA", { [modifier]: true });
        target.dispatchEvent(shortcut);
        assert.ok(!shortcut.defaultPrevented && !input.isDown("left"), modifier);
    }
    const proto = key("keydown", "constructor");
    target.dispatchEvent(proto);
    assert.ok(!proto.defaultPrevented);
});

test("losing focus releases every key, and detaching stops listening", () => {
    const target = new EventTarget();
    const input = createInput();
    const detach = attachKeyboard(target, input);
    target.dispatchEvent(key("keydown", "KeyD"));
    target.dispatchEvent(key("keydown", "Space"));
    assert.ok(input.isDown("right") && input.isDown("a"));
    target.dispatchEvent(new Event("blur"));
    assert.ok(!input.isDown("right") && !input.isDown("a"));
    detach();
    target.dispatchEvent(key("keydown", "KeyD"));
    assert.ok(!input.isDown("right"));
});

test("a custom keymap works, and values that are not actions are ignored", () => {
    const target = new EventTarget();
    const input = createInput();
    attachKeyboard(target, input, { KeyJ: "a", KeyK: "fire" });
    target.dispatchEvent(key("keydown", "KeyJ"));
    const bad = key("keydown", "KeyK");
    target.dispatchEvent(bad);
    assert.ok(input.isDown("a"));
    assert.ok(!bad.defaultPrevented);
});

function fakeCanvas() {
    const ctx = { cleared: [], clearRect(...args) { this.cleared.push(args); }, imageSmoothingEnabled: true };
    return { ctx, canvas: { width: 0, height: 0, style: {}, getContext: (kind) => (kind === "2d" ? ctx : null) } };
}

function fakeFrames() {
    const queue = new Map();
    let next = 1;
    const cancelled = [];
    return {
        queue,
        cancelled,
        requestFrame: (callback) => (queue.set(next, callback), next++),
        cancelFrame: (handle) => (cancelled.push(handle), queue.delete(handle)),
        tick(time) {
            const [handle, callback] = [...queue][0];
            queue.delete(handle);
            callback(time);
        }
    };
}

test("start sizes the canvas in game pixels, scales it without smoothing, and runs the game", () => {
    const { canvas, ctx } = fakeCanvas();
    const frames = fakeFrames();
    let updates = 0;
    let renders = 0;
    const game = createGame({ scene: { update: () => (updates += 1), render: () => (renders += 1) } });
    start(game, canvas, { width: 160, height: 144, scale: 3, ...frames });
    assert.deepEqual([canvas.width, canvas.height, canvas.style.width, canvas.style.height, canvas.style.imageRendering], [160, 144, "480px", "432px", "pixelated"]);
    assert.equal(ctx.imageSmoothingEnabled, false);
    frames.tick(1000);
    assert.deepEqual([updates, renders], [0, 1], "the first frame draws but does not update");
    frames.tick(1000 + 1000 / 60);
    frames.tick(1000 + 2000 / 60);
    assert.deepEqual([updates, renders], [2, 3]);
    assert.equal(ctx.cleared.length, 3);
    assert.deepEqual(ctx.cleared[0], [0, 0, 160, 144]);
});

test("stop cancels the pending frame and nothing runs after it", () => {
    const { canvas } = fakeCanvas();
    const frames = fakeFrames();
    let renders = 0;
    const game = createGame({ scene: { update() {}, render: () => (renders += 1) } });
    const stop = start(game, canvas, { width: 16, height: 16, ...frames });
    frames.tick(0);
    const pending = [...frames.queue.keys()][0];
    stop();
    assert.deepEqual(frames.cancelled, [pending]);
    assert.equal(frames.queue.size, 0);
    assert.equal(renders, 1);
});

test("start refuses a size or scale that would blur or fail", () => {
    const { canvas } = fakeCanvas();
    const game = createGame({ scene: { update() {}, render() {} } });
    const frames = fakeFrames();
    for (const scale of [0, 1.5, -2, NaN]) assert.throws(() => start(game, canvas, { width: 16, height: 16, scale, ...frames }), /scale/, String(scale));
    for (const [width, height] of [[0, 16], [16, 0], [16.5, 16], [NaN, 16]]) {
        assert.throws(() => start(game, canvas, { width, height, ...frames }), /whole numbers/, `${width}x${height}`);
    }
    assert.throws(() => start(game, { ...canvas, getContext: () => null }, { width: 16, height: 16, ...frames }), /2D canvas/);
    assert.equal(frames.queue.size, 0, "nothing was scheduled by a refused start");
});
