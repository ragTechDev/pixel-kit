import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createGame } from "../dist/index.js";
import { GameView, useGame } from "../dist/react.js";

const make = () => createGame({ scene: { update() {}, render() {} } });

test("GameView renders a focusable, labelled canvas at the scaled size", () => {
    const html = renderToStaticMarkup(createElement(GameView, { game: make(), width: 160, height: 144, title: "A small town", className: "stage" }));
    assert.match(html, /^<canvas /);
    for (const part of ['width="160"', 'height="144"', 'tabindex="0"', 'role="img"', 'aria-label="A small town"', 'class="stage"', "width:480px", "height:432px", "image-rendering:pixelated"]) {
        assert.ok(html.includes(part), part);
    }
});

test("the zoom can be changed", () => {
    const html = renderToStaticMarkup(createElement(GameView, { game: make(), width: 16, height: 16, scale: 5 }));
    assert.ok(html.includes("width:80px") && html.includes("height:80px"));
});

test("useGame creates the game once per component", () => {
    let created = 0;
    function Probe() {
        const game = useGame(() => (created += 1, make()));
        return createElement("i", null, typeof game.advance);
    }
    assert.equal(renderToStaticMarkup(createElement(Probe)), "<i>function</i>");
    assert.equal(created, 1);
});
