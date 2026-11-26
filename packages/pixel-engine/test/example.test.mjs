// Runs the README quick start for real, with the library's own drawing code on a fake canvas,
// so the documented example cannot drift from what the code does.
import assert from "node:assert/strict";
import test from "node:test";
import { buildAvatar, buildMap, defineMap, mapTileSize, townTileset, TILE_SIZE } from "@ragtechdev/pixel-sprites";
import { drawRaster } from "@ragtechdev/pixel-sprites/canvas";
import { createCamera, createGame, createWalker, isWalkable } from "../dist/index.js";

class FakeOffscreenCanvas {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
    getContext() {
        return { createImageData: (w, h) => ({ data: { set() {} }, width: w, height: h }), putImageData() {} };
    }
}

function setup() {
    globalThis.OffscreenCanvas = FakeOffscreenCanvas;
    const map = defineMap(townTileset, ["gggg", "gwgg", "gggg"]);
    const ground = buildMap(map);
    const tiles = mapTileSize(map);
    const camera = createCamera({ width: 128, height: 96 }, { width: tiles.width * TILE_SIZE, height: tiles.height * TILE_SIZE });
    const sprites = {
        up: buildAvatar({ headOrientation: "back" }),
        down: buildAvatar({ headOrientation: "front" }),
        left: buildAvatar({ headOrientation: "left" }),
        right: buildAvatar({ headOrientation: "right" })
    };
    let hero;
    const game = createGame({
        scene: (game) => {
            hero = createWalker({ x: 1, y: 0 });
            const canEnter = (x, y) => isWalkable(map, x, y);
            return {
                update(dt) {
                    const direction = game.input.heldDirection();
                    if (direction) hero.walk(direction, canEnter);
                    hero.update(dt);
                    camera.follow(hero.x + TILE_SIZE / 2, hero.y + TILE_SIZE / 2);
                },
                render(ctx) {
                    drawRaster(ctx, ground, -camera.x, -camera.y);
                    drawRaster(ctx, sprites[hero.facing], hero.x - camera.x, hero.y - camera.y - 8);
                }
            };
        }
    });
    return { game, hero: () => hero, map, camera, ground, sprites };
}

// Time arrives a frame at a time, as it does from requestAnimationFrame. One huge advance would be clamped to maxFrame.
const play = (game, seconds) => {
    for (let i = 0; i < Math.round(seconds * 60); i += 1) game.advance(1 / 60);
};

const makeCtx = () => {
    const draws = [];
    return { draws, imageSmoothingEnabled: true, drawImage: (...args) => draws.push(args) };
};

test("the quick start walks the hero down, stops at the water, and draws the map and the hero", (t) => {
    t.after(() => delete globalThis.OffscreenCanvas);
    const { game, hero, camera } = setup();
    const ctx = makeCtx();

    game.input.press("down");
    play(game, 0.5); // two tiles at four tiles a second
    assert.deepEqual([hero().tx, hero().ty], [1, 2]);
    game.input.release("down");

    game.input.press("right"); // the tile at (2, 2) is water
    play(game, 0.5);
    assert.deepEqual([hero().tx, hero().ty], [1, 2], "water blocks the way");
    assert.equal(hero().facing, "right", "but the hero turns to face it");

    game.render(ctx);
    assert.equal(ctx.draws.length, 2, "the map, then the hero");
    assert.equal(ctx.imageSmoothingEnabled, false);
    const [, mapX, mapY] = ctx.draws[0];
    assert.deepEqual([mapX, mapY], [-camera.x, -camera.y]);
    const [, heroX, heroY] = ctx.draws[1];
    assert.deepEqual([heroX, heroY], [hero().x - camera.x, hero().y - camera.y - 8]);
    assert.ok(Number.isInteger(heroX) && Number.isInteger(heroY), "drawn on whole pixels");
});

test("the hero cannot leave the map", () => {
    globalThis.OffscreenCanvas = FakeOffscreenCanvas;
    const { game, hero } = setup();
    game.input.press("up");
    play(game, 1);
    assert.deepEqual([hero().tx, hero().ty], [1, 0]);
    delete globalThis.OffscreenCanvas;
});
