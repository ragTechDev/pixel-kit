import assert from "node:assert/strict";
import test from "node:test";
import { createCarry } from "../dist/index.js";

const frame = 1 / 60;
const run = (carry, seconds) => {
    for (let i = 0; i < Math.round(seconds / frame); i += 1) carry.update(frame);
};
const avatar = { width: 22, height: 24 };
const thing = { width: 10, height: 10 };
const from = { x: 6, y: 24 };

test("nothing is held to begin with", () => {
    const carry = createCarry();
    assert.equal(carry.phase, "empty");
    assert.equal(carry.item, undefined);
    assert.equal(carry.busy, false);
    assert.equal(carry.pose(avatar, thing, "down"), undefined);
    assert.equal(carry.drop(), undefined);
});

test("picking up goes through reach, lift and show, then holds the object", () => {
    const carry = createCarry({ reach: 0.2, lift: 0.3, show: 0.4, settle: 0.1 });
    assert.equal(carry.pickUp("apple", from), true);
    assert.deepEqual([carry.phase, carry.busy, carry.item], ["reach", true, "apple"]);
    run(carry, 0.25);
    assert.equal(carry.phase, "lift");
    run(carry, 0.3);
    assert.equal(carry.phase, "show");
    assert.equal(carry.busy, true);
    run(carry, 0.4);
    assert.deepEqual([carry.phase, carry.busy, carry.item], ["hold", false, "apple"]);
});

test("the object rises from where it lay to above the head, and comes down to be carried in front", () => {
    const carry = createCarry({ reach: 0.2, lift: 0.3, show: 0.4, settle: 0.1 });
    carry.pickUp(1, from);
    // Bending: the object has not moved and the avatar goes down a little, then comes back up.
    run(carry, 0.1);
    const bending = carry.pose(avatar, thing, "down");
    assert.deepEqual([bending.x, bending.y], [6, 24]);
    assert.ok(bending.crouch > 0 && bending.crouch <= 3);
    run(carry, 0.2);
    // Lifting: on its way up, and not crouching.
    const lifting = carry.pose(avatar, thing, "down");
    assert.equal(lifting.crouch, 0);
    assert.ok(lifting.y < 24 && lifting.y > -11);
    run(carry, 0.2);
    // Shown: centred over the head, clear of it.
    const shown = carry.pose(avatar, thing, "down");
    assert.deepEqual([shown.x, shown.y], [6, -11]);
    run(carry, 0.4);
    run(carry, 0.2);
    // Held: low in front of the body, centred.
    const held = carry.pose(avatar, thing, "down");
    assert.deepEqual([held.x, held.y, held.crouch, held.behind], [6, 12, 0, false]);
});

test("a held object is carried out toward where the avatar faces, and behind it when its back is turned", () => {
    const carry = createCarry({ reach: 0, lift: 0, show: 0, settle: 0 });
    carry.pickUp("pumpkin", from);
    carry.update(frame);
    assert.equal(carry.phase, "hold");
    const at = (facing) => carry.pose(avatar, thing, facing);
    assert.equal(at("left").x, at("down").x - 4);
    assert.equal(at("right").x, at("down").x + 4);
    assert.equal(at("up").behind, true);
    assert.equal(at("down").behind, false);
    for (const facing of ["up", "down", "left", "right"]) {
        const pose = at(facing);
        assert.ok(Number.isInteger(pose.x) && Number.isInteger(pose.y), facing);
    }
});

test("only one thing can be held, and dropping gives it back", () => {
    const carry = createCarry();
    assert.equal(carry.pickUp("carrot", from), true);
    assert.equal(carry.pickUp("beet", from), false, "hands are full");
    assert.equal(carry.item, "carrot");
    assert.equal(carry.drop(), "carrot");
    assert.equal(carry.phase, "empty");
    assert.equal(carry.pickUp("beet", from), true);
});

test("a long frame goes through several phases at once", () => {
    const carry = createCarry({ reach: 0.2, lift: 0.3, show: 0.4 });
    carry.pickUp(1, from);
    carry.update(5);
    assert.equal(carry.phase, "hold");
    assert.equal(carry.busy, false);
});
