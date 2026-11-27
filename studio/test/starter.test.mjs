// Plays the starter project that `npm create @ragtechdev/pixel-game` copies (packages/create-pixel-game/template) headlessly, against
// the sources of both packages, so the starter's maps and exits stay true as the kit changes: in through the town's door, and out of
// the house through the gap in its near wall.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test, { before } from "node:test";
import { build } from "esbuild";

const root = (path) => fileURLToPath(new URL(`../../${path}`, import.meta.url));
const aliases = {
    "@ragtechdev/pixel-sprites": root("packages/pixel-sprites/src/index.ts"),
    "@ragtechdev/pixel-sprites/canvas": root("packages/pixel-sprites/src/canvas/index.ts"),
    "@ragtechdev/pixel-engine": root("packages/pixel-engine/src/index.ts")
};

class FakeOffscreenCanvas {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
    getContext() {
        return { createImageData: (w, h) => ({ data: { set() {} }, width: w, height: h }), putImageData() {} };
    }
}

let loaded;
before(async () => {
    globalThis.OffscreenCanvas = FakeOffscreenCanvas;
    const bundle = await build({
        stdin: { contents: `export * from "./src/game"; export * from "./src/maps"; export { queryCell, solidBoxes } from "@ragtechdev/pixel-sprites";`, resolveDir: root("packages/create-pixel-game/template"), loader: "ts" },
        bundle: true,
        write: false,
        format: "esm",
        platform: "node",
        logLevel: "silent",
        plugins: [{ name: "source-aliases", setup(b) { b.onResolve({ filter: /^@ragtechdev\// }, (args) => (aliases[args.path] ? { path: aliases[args.path] } : undefined)); } }]
    });
    loaded = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
});

const frame = 1 / 60;
const context = () => {
    const draws = [];
    return { draws, imageSmoothingEnabled: true, fillStyle: "", fillRect() {}, drawImage: (...a) => draws.push(a) };
};
// The width in tiles of the map being drawn: the first thing drawn is the ground.
const placeWidth = (game) => {
    const ctx = context();
    game.render(ctx);
    return ctx.draws[0][0].width / 16;
};
const walk = (game, direction, seconds) => {
    game.input.press(direction);
    for (let i = 0; i < Math.round(seconds / frame); i += 1) game.advance(frame);
    game.input.release(direction);
    game.advance(frame);
};

test("the starter's house is a room with thin walls and a gap, and the town's door leads in and the gap leads out", () => {
    const { house, town, queryCell } = loaded;
    assert.equal(queryCell(house, 0, 4).solid, true, "the side wall blocks");
    assert.equal(queryCell(house, 4, 11).solid, true, "and the near wall");
    assert.equal(queryCell(house, 6, 11).solid, false, "the gap does not");
    assert.equal(queryCell(house, 7, 11).solid, false);
    assert.ok(!house.objects.some((o) => o.id === "door"), "there is no door in the house, only the gap");
    const game = loaded.createWorld();
    game.advance(frame);
    assert.equal(placeWidth(game), town.width * town.tileset.blockSize, "starts in the town");
    walk(game, "up", 2);
    assert.equal(placeWidth(game), house.width * house.tileset.blockSize, "the door leads into the house");
    walk(game, "up", 0.5);
    walk(game, "down", 3);
    assert.equal(placeWidth(game), town.width * town.tileset.blockSize, "and the gap in the near wall leads back out");
});
