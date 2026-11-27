import assert from "node:assert/strict";
import test from "node:test";
import { createPopups } from "../dist/index.js";

const frame = 1 / 60;
const run = (popups, seconds) => {
    for (let i = 0; i < Math.round(seconds / frame); i += 1) popups.update(frame);
};
const target = { x: 40, y: 50, width: 22, height: 24 };
const icon = { width: 12, height: 10 };

test("nothing shows to begin with", () => {
    assert.deepEqual(createPopups().active, []);
});

test("a popup is centred above what it sits on, with the item it was given", () => {
    const popups = createPopups({ gap: 1, rise: 4 });
    popups.show("heart", target, icon);
    const [popup] = popups.active;
    assert.equal(popup.item, "heart");
    assert.equal(popup.x, 40 + (22 - 12) / 2, "centred over it");
    assert.equal(popup.y, 50 - 10 - 1, "its bottom edge just above the top of it");
    assert.equal(popup.alpha, 1);
});

test("it floats up while it shows, fades out at the end, and is then gone", () => {
    const popups = createPopups({ duration: 1, rise: 4, gap: 1, fade: 0.25 });
    popups.show("comment", target, icon);
    const start = popups.active[0].y;
    run(popups, 0.5);
    const middle = popups.active[0];
    assert.ok(middle.y < start && middle.y >= start - 4, "rising");
    assert.equal(middle.alpha, 1, "still fully showing");
    run(popups, 0.4);
    const ending = popups.active[0];
    assert.ok(ending.alpha > 0 && ending.alpha < 1, "fading");
    assert.ok(start - ending.y <= 4);
    run(popups, 0.2);
    assert.deepEqual(popups.active, []);
});

test("a popup follows an anchor that moves", () => {
    const popups = createPopups();
    const who = { x: 0, y: 0, width: 20, height: 24 };
    popups.show("heart", () => who, icon);
    const before = popups.active[0];
    who.x += 30;
    who.y += 10;
    const after = popups.active[0];
    assert.equal(after.x - before.x, 30);
    assert.equal(after.y - before.y, 10);
});

test("showing again with the same key restarts the popup instead of stacking another", () => {
    const popups = createPopups({ duration: 1 });
    popups.show("comment", target, icon, "npc");
    run(popups, 0.8);
    popups.show("heart", target, icon, "npc");
    assert.equal(popups.active.length, 1);
    assert.equal(popups.active[0].item, "heart");
    run(popups, 0.5);
    assert.equal(popups.active.length, 1, "restarted, so it has not run out");
    // Different keys, or none, stack, with the newest last.
    popups.show("a", target, icon, "other");
    popups.show("b", target, icon);
    assert.deepEqual(popups.active.map((p) => p.item), ["heart", "a", "b"]);
});

test("positions are whole pixels, and clear removes everything", () => {
    const popups = createPopups();
    popups.show("x", { x: 0.4, y: 7.3, width: 15, height: 9 }, { width: 8, height: 7 });
    run(popups, 0.37);
    const [p] = popups.active;
    assert.ok(Number.isInteger(p.x) && Number.isInteger(p.y));
    popups.clear();
    assert.deepEqual(popups.active, []);
});
