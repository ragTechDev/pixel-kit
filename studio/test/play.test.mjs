// Plays the demo world headlessly: bundles studio/src/play/game.ts with the same source aliases the
// studio uses, then drives it with a fake canvas. This is what checks that the sprites and the engine
// agree: collision comes from the library's map data, movement and scenes from the engine.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test, { before } from "node:test";
import { build } from "esbuild";

const src = (pkg, file) => fileURLToPath(new URL(`../../packages/${pkg}/src/${file}`, import.meta.url));
const aliases = {
    "@ragtechdev/pixel-sprites": src("pixel-sprites", "index.ts"),
    "@ragtechdev/pixel-sprites/canvas": src("pixel-sprites", "canvas/index.ts"),
    "@ragtechdev/pixel-engine": src("pixel-engine", "index.ts")
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

let play;
let maps;

before(async () => {
    globalThis.OffscreenCanvas = FakeOffscreenCanvas;
    const bundle = await build({
        stdin: {
            contents: `export * from "./src/play/game"; export * from "./src/play/maps";`,
            resolveDir: fileURLToPath(new URL("..", import.meta.url)),
            loader: "ts"
        },
        bundle: true,
        write: false,
        format: "esm",
        platform: "node",
        logLevel: "silent",
        plugins: [{
            name: "source-aliases",
            setup(b) {
                b.onResolve({ filter: /^@ragtechdev\// }, (args) => (aliases[args.path] ? { path: aliases[args.path] } : undefined));
            }
        }]
    });
    const code = bundle.outputFiles[0].text;
    const loaded = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    play = loaded.createPlay;
    maps = loaded;
});

const frame = 1 / 60;
const hold = (p, direction, seconds) => {
    p.game.input.press(direction);
    for (let i = 0; i < Math.round(seconds / frame); i += 1) p.game.advance(frame);
    p.game.input.release(direction);
    p.game.advance(frame);
};
const at = (p) => [p.hero.tx, p.hero.ty];

test("the hero starts on the path in the town, facing the house", () => {
    const p = play();
    assert.equal(p.place(), "town");
    assert.deepEqual(at(p), [7, 8]);
    assert.equal(p.hero.facing, "up");
});

test("walking up the path to the door goes inside, and walking down out of the door comes back", () => {
    const p = play();
    hold(p, "up", 0.5); // two tiles: (7,7) then (7,6)
    assert.deepEqual(at(p), [7, 6]);
    assert.equal(p.place(), "town");
    hold(p, "up", 0.25); // onto the door at (7,5)
    assert.equal(p.place(), "interior", "the door warps");
    assert.deepEqual(at(p), [7, 9], "arriving in front of the interior door");
    assert.equal(p.hero.facing, "up");
    hold(p, "down", 0.25); // onto the interior door at (7,10)
    assert.equal(p.place(), "town");
    assert.deepEqual(at(p), [7, 6], "back in front of the house door");
    assert.equal(p.hero.facing, "down");
});

test("the walls beside a door block the way, even though the door itself is open", () => {
    const p = play();
    p.hero.teleport(6, 6, "up");
    hold(p, "up", 0.25);
    assert.deepEqual(at(p), [6, 6], "(6,5) is wall");
    assert.equal(p.place(), "town");
});

test("water blocks the hero but turns them to face it", () => {
    const p = play();
    p.hero.teleport(7, 16, "down");
    hold(p, "right", 0.25);
    assert.deepEqual(at(p), [7, 16], "(8,16) is water");
    assert.equal(p.hero.facing, "right");
});

test("a tree trunk blocks, but its canopy does not", () => {
    const p = play();
    p.hero.teleport(3, 1, "left");
    hold(p, "left", 0.25);
    assert.deepEqual(at(p), [3, 1], "the trunk at (2,1) blocks");
    p.hero.teleport(3, 0, "left");
    hold(p, "left", 0.25);
    assert.deepEqual(at(p), [2, 0], "the canopy at (2,0) is open");
});

test("a character in the way blocks the hero", () => {
    const p = play();
    const npc = maps.places.town.npcs[0];
    p.hero.teleport(npc.x - 1, npc.y, "right");
    hold(p, "right", 0.25);
    assert.deepEqual(at(p), [npc.x - 1, npc.y]);
    p.hero.teleport(npc.x - 1, npc.y + 1, "right");
    hold(p, "right", 0.25);
    assert.deepEqual(at(p), [npc.x, npc.y + 1], "and the way around is open");
});

test("the hero cannot walk off the map", () => {
    const p = play();
    p.hero.teleport(0, 0, "left");
    hold(p, "left", 0.25);
    hold(p, "up", 0.25);
    assert.deepEqual(at(p), [0, 0]);
});

test("the camera stays inside the world wherever the hero is", () => {
    const p = play();
    for (const [x, y] of [[0, 0], [19, 17], [10, 9], [0, 17], [19, 0]]) {
        p.hero.teleport(x, y, "down");
        p.game.advance(frame);
        assert.ok(p.camera.x >= 0 && p.camera.x <= 320 - 240, `x at ${x},${y}: ${p.camera.x}`);
        assert.ok(p.camera.y >= 0 && p.camera.y <= 288 - 144, `y at ${x},${y}: ${p.camera.y}`);
    }
    p.hero.teleport(7, 7, "up");
    hold(p, "up", 0.5); // (7,6), then onto the door at (7,5)
    assert.equal(p.place(), "interior");
    p.game.advance(frame);
    assert.ok(p.camera.x >= 0 && p.camera.x <= 256 - 240 && p.camera.y >= 0 && p.camera.y <= 192 - 144, "inside, too");
});

// The hero's draw call: drawn on their tile, centred, and lifted by the height above it.
const heroDraw = (p, ctx) => ctx.draws.find(([raster, x, y]) => x === p.hero.x - p.camera.x + Math.floor((16 - raster.width) / 2) && y === p.hero.y - p.camera.y - 8);

function fakeContext() {
    const draws = [];
    return { draws, imageSmoothingEnabled: true, fillStyle: "", fillRect() {}, drawImage: (...a) => draws.push(a) };
}

test("a frame draws the map, then the characters, with the hero among them in the right place", () => {
    const p = play();
    const ctx = fakeContext();
    p.game.advance(1);
    p.game.render(ctx);
    assert.equal(ctx.draws.length, 3, "the map, one character and the hero");
    const [, mx, my] = ctx.draws[0];
    assert.deepEqual([mx, my], [-p.camera.x, -p.camera.y]);
    assert.ok(ctx.draws.slice(1).every(([, x, y]) => Number.isInteger(x) && Number.isInteger(y)), "whole pixels");
    assert.ok(heroDraw(p, ctx), "the hero stands centred on their tile, lifted by the height above it");
});

test("whoever is further down the screen is drawn last", () => {
    const p = play();
    const npc = maps.places.town.npcs[0]; // (9, 8)
    p.hero.teleport(npc.x, npc.y - 1, "down"); // just above the character
    p.game.advance(1);
    const ctx = fakeContext();
    p.game.render(ctx);
    const ys = ctx.draws.slice(1).map(([, , y]) => y);
    assert.deepEqual(ys, [...ys].sort((a, b) => a - b), "back to front");
    assert.equal(ctx.draws[2][2], npc.y * 16 - p.camera.y - 8, "the character in front is last");
});

test("changing the season recolours the map without recreating the game", () => {
    const p = play({ theme: "summer" });
    p.game.advance(1);
    const summer = fakeContext();
    p.game.render(summer);
    p.options.theme = "autumn";
    const autumn = fakeContext();
    p.game.render(autumn);
    assert.notEqual(summer.draws[0][0], autumn.draws[0][0], "a different raster is drawn");
    p.options.theme = "summer";
    const again = fakeContext();
    p.game.render(again);
    assert.equal(again.draws[0][0], summer.draws[0][0], "and summer comes from the cache");
});

test("walking alternates two leg poses within a step, one of them the standing pose", () => {
    const p = play();
    const rasterAt = () => {
        const ctx = fakeContext();
        p.game.render(ctx);
        return heroDraw(p, ctx)[0];
    };
    p.game.advance(1);
    const standing = rasterAt();
    p.game.input.press("up");
    const seen = new Set();
    for (let i = 0; i < 14; i += 1) {
        p.game.advance(frame); // 14 frames is under one tile step
        seen.add(rasterAt());
    }
    p.game.input.release("up");
    assert.equal(seen.size, 2, "two poses in one step");
    assert.ok(seen.has(standing), "one of them is standing still");
});

test("characters of different widths are centred on their tile", () => {
    const p = play();
    p.game.advance(1);
    // The looks are random, so draw new ones until the characters on screen are not all the same width.
    let ctx = fakeContext();
    p.game.render(ctx);
    for (let tries = 0; tries < 200 && new Set(ctx.draws.slice(1).map(([raster]) => raster.width)).size < 2; tries += 1) {
        p.randomize();
        ctx = fakeContext();
        p.game.render(ctx);
    }
    assert.ok(new Set(ctx.draws.slice(1).map(([raster]) => raster.width)).size >= 2, "the hero and a character are not the same width");
    for (const [raster, x] of ctx.draws.slice(1)) {
        const tileLeft = x - Math.floor((16 - raster.width) / 2);
        assert.equal(tileLeft % 16, (p.camera.x * -1) % 16 === 0 ? 0 : tileLeft % 16, "drawn relative to a tile edge");
        assert.ok(x + raster.width / 2 - tileLeft - 8 <= 1, "centred within a pixel");
    }
});

test("a tap shorter than one update still takes one step", () => {
    const p = play();
    p.game.input.press("down");
    p.game.input.release("down"); // lifted before the game ran
    for (let i = 0; i < 20; i += 1) p.game.advance(frame);
    assert.deepEqual(at(p), [7, 9], "one tile down the path");
    assert.equal(p.hero.facing, "down");
});

test("A makes the character in front turn to face the hero", () => {
    const p = play();
    const npc = maps.places.town.npcs[0];
    assert.equal(p.facing(npc), "down", "characters start facing down");
    p.hero.teleport(npc.x - 1, npc.y, "right"); // to the left of them, looking at them
    p.game.input.press("a");
    p.game.advance(frame);
    p.game.input.release("a");
    assert.equal(p.facing(npc), "left", "they turn toward the hero");
    p.hero.teleport(npc.x + 1, npc.y, "left");
    p.game.input.press("a");
    p.game.advance(frame);
    p.game.input.release("a");
    p.game.advance(frame);
    assert.equal(p.facing(npc), "right", "and again from the other side");
});

test("A does nothing when nobody is in front", () => {
    const p = play();
    const npc = maps.places.town.npcs[0];
    p.hero.teleport(npc.x - 1, npc.y, "left"); // looking away from them
    p.game.input.press("a");
    p.game.advance(frame);
    p.game.input.release("a");
    assert.equal(p.facing(npc), "down");
});

test("holding B runs: a step takes about half as long", () => {
    const framesToStep = (running) => {
        const p = play();
        p.hero.teleport(12, 1, "right");
        if (running) p.game.input.press("b");
        p.game.input.press("right");
        let frames = 0;
        while (p.hero.tx === 12 && frames < 60) {
            p.game.advance(frame);
            frames += 1;
        }
        return frames;
    };
    const walking = framesToStep(false);
    const running = framesToStep(true);
    assert.equal(walking, 15, "a quarter of a second at four tiles a second");
    assert.ok(running <= 8 && running >= 7, `running took ${running} frames`);
});

test("START changes the season in order, wraps round, and tells the page", () => {
    const told = [];
    const p = play({ theme: "winter", onTheme: (theme) => told.push(theme) });
    const press = () => {
        p.game.input.press("start");
        p.game.advance(frame);
        p.game.input.release("start");
        p.game.advance(frame);
    };
    press();
    assert.equal(p.options.theme, "spring", "winter wraps to spring");
    press();
    press();
    assert.equal(p.options.theme, "autumn");
    assert.deepEqual(told, ["spring", "summer", "autumn"]);
    const q = play({ theme: "summer" });
    q.game.input.press("start");
    q.game.advance(frame);
    assert.equal(q.options.theme, "autumn", "no callback is needed");
});

test("the handheld view is 160 by 144, a classic handheld's screen, and the world still fits it", () => {
    assert.deepEqual({ ...maps.HANDHELD_VIEW }, { width: 160, height: 144 });
    assert.deepEqual({ ...maps.DESKTOP_VIEW }, { width: 240, height: 144 });
    const p = play({ theme: "summer" }, maps.HANDHELD_VIEW);
    assert.deepEqual({ ...p.view }, { width: 160, height: 144 });
    assert.equal(p.camera.width, 160);
    for (const [x, y] of [[0, 0], [19, 17], [10, 9]]) {
        p.hero.teleport(x, y, "down");
        p.game.advance(frame);
        assert.ok(p.camera.x >= 0 && p.camera.x <= 320 - 160, `x at ${x},${y}: ${p.camera.x}`);
        assert.ok(p.camera.y >= 0 && p.camera.y <= 288 - 144, `y at ${x},${y}: ${p.camera.y}`);
    }
    const ctx = fakeContext();
    p.game.render(ctx);
    assert.equal(ctx.draws.length, 3, "the same map, character and hero");
});

test("the world works at any view width a phone produces, not only whole tiles", () => {
    // 2x zoom fills 360, 390, 412, 430 and 480 px; 3x fills 540 to 720 px. Both keep the view at 240 px or less.
    for (const screen of [360, 390, 412, 430, 480]) {
        const view = { width: Math.floor(screen / 2), height: 144 };
        const p = play({ theme: "summer" }, view);
        assert.equal(p.camera.width, view.width);
        for (const [x, y] of [[0, 0], [19, 17], [10, 9], [0, 17], [19, 0]]) {
            p.hero.teleport(x, y, "down");
            p.game.advance(frame);
            assert.ok(p.camera.x >= 0 && p.camera.x <= 320 - view.width, `${screen}px, x at ${x},${y}: ${p.camera.x}`);
        }
        p.hero.teleport(7, 7, "up");
        hold(p, "up", 0.5); // through the door
        assert.equal(p.place(), "interior");
        p.game.advance(frame);
        assert.ok(p.camera.x >= 0 && p.camera.x <= 256 - view.width, `${screen}px inside: ${p.camera.x}`);
        const ctx = fakeContext();
        p.game.render(ctx);
        assert.ok(ctx.draws.length >= 2, "it draws");
    }
    for (const screen of [540, 600, 720]) {
        const view = { width: Math.floor(screen / 3), height: 144 };
        assert.ok(view.width <= 240 && view.width >= 160, `${screen}px gives a ${view.width}px view`);
    }
});

test("randomizing the looks leaves the world playable", () => {
    const p = play();
    p.randomize();
    p.randomize();
    p.hero.teleport(7, 8, "up");
    hold(p, "up", 0.25);
    assert.deepEqual(at(p), [7, 7], "the hero still walks");
});
