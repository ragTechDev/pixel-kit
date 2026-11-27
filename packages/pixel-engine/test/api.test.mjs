import assert from "node:assert/strict";
import test from "node:test";
import * as core from "../dist/index.js";
import * as dom from "../dist/dom.js";
import * as react from "../dist/react.js";

// The published surface. Adding or removing an export should be a deliberate change to this list.
test("the core entry exports exactly the documented API", () => {
    assert.deepEqual(Object.keys(core).sort(), [
        "actions", "cameraOrigin", "createCamera", "createGame", "createInput", "createLoop",
        "createMover", "createScenes", "createWalker", "directions", "isAction", "isOpen", "isWalkable", "neighbor", "overlaps"
    ]);
});

test("the dom and react entries export exactly the documented API", () => {
    assert.deepEqual(Object.keys(dom).sort(), ["attachKeyboard", "defaultKeymap", "start"]);
    assert.deepEqual(Object.keys(react).sort(), ["GameView", "useGame"]);
});
