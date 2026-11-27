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
            contents: `export * from "./src/play/game"; export * from "./src/play/maps"; export { doorBoxes, mapDrawables, solidBoxes } from "@ragtechdev/pixel-sprites";`,
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
// The tile the hero's feet are on.
// Holds a direction until the hero goes through a door, then lets go at once.
const holdThroughDoor = (p, direction, seconds = 3) => {
    const from = p.place();
    p.game.input.press(direction);
    for (let i = 0; i < Math.round(seconds / frame) && p.place() === from; i += 1) p.game.advance(frame);
    p.game.input.release(direction);
    p.game.advance(frame);
};
const at = (p) => [Math.floor((p.hero.feet.x + p.hero.feet.width / 2) / 16), Math.floor((p.hero.feet.y + p.hero.feet.height / 2) / 16)];
// Puts the hero in the top-left of a tile, as the world's doors and spawns do.
const put = (p, tx, ty, facing) => p.hero.teleport(tx * 16, ty * 16, facing);

test("the hero starts on the path in the town, facing the house", () => {
    const p = play();
    assert.equal(p.place(), "town");
    assert.deepEqual(at(p), [7, 8]);
    assert.equal(p.hero.facing, "up");
});

test("walking up the path to the door goes inside, and walking down out of the door comes back", () => {
    const p = play();
    hold(p, "up", 0.5);
    assert.equal(p.place(), "town", "still short of the door");
    holdThroughDoor(p, "up"); // onto the door at (7,5)
    assert.equal(p.place(), "interior", "the door warps");
    assert.deepEqual(at(p), [7, 9], "arriving in front of the interior door");
    assert.equal(p.hero.facing, "up");
    holdThroughDoor(p, "down"); // onto the interior door at (7,10)
    assert.equal(p.place(), "town");
    assert.deepEqual(at(p), [7, 6], "back in front of the house door");
    assert.equal(p.hero.facing, "down");
});

test("the walls beside a door block the way, right up to the foot of the wall, even though the door itself is open", () => {
    const p = play();
    put(p, 6, 6, "up");
    hold(p, "up", 0.5);
    assert.equal(p.place(), "town");
    assert.deepEqual(at(p), [6, 6]);
    assert.equal(p.hero.feet.y, 96, "the feet are on the line the wall stands on, not a tile away");
});

test("a building can be walked right up to, and its wall stopped at the drawn edge, not at the edge of its tiles", () => {
    const p = play();
    const town = maps.places.town.map;
    const walls = maps.solidBoxes(town).filter((box) => box.width >= 16 && box.height >= 32);
    const wall = walls.reduce((a, b) => (b.x < a.x ? b : a));
    p.hero.teleport(wall.x - 30, wall.y + 16 - 12, "right");
    hold(p, "right", 1);
    assert.equal(p.hero.feet.x + p.hero.feet.width, wall.x, "flush with the wall");
    assert.equal(wall.x % 16, 4, "which is inset from the tile edge by the roof's overhang, so it is closer than a tile");
});

test("a hero behind a building is covered by it, and one in front covers it", () => {
    const p = play();
    const town = maps.places.town.map;
    const building = maps.mapDrawables(town, "summer").standing.find((d) => d.raster.height >= 48);
    const walls = maps.solidBoxes(town).filter((box) => box.width >= 16 && box.height >= 32);
    const wall = walls.reduce((a, b) => (b.x < a.x ? b : a));
    const order = () => {
        p.game.advance(frame);
        const ctx = fakeContext();
        p.game.render(ctx);
        const hero = ctx.draws.indexOf(heroDraw(p, ctx));
        const built = ctx.draws.findIndex(([, x, y]) => x === building.x - p.camera.x && y === building.y - p.camera.y);
        return { hero, built };
    };
    // Up in the roof rows, behind the wall: the hero's feet end on the top of the wall, under the roof.
    p.hero.teleport(wall.x + 10, wall.y - 40, "down");
    hold(p, "down", 1);
    assert.equal(p.hero.feet.y + p.hero.feet.height, wall.y, "stopped at the top of the wall");
    let { hero, built } = order();
    assert.ok(hero >= 0 && built > hero, "the building is drawn after the hero, so it covers them");
    // In front of the building.
    p.hero.teleport(wall.x + 10, wall.y + wall.height + 20, "up");
    ({ hero, built } = order());
    assert.ok(hero > built, "the hero is drawn after the building");
});

test("water blocks the hero but turns them to face it", () => {
    const p = play();
    put(p, 7, 16, "down");
    hold(p, "right", 0.5);
    assert.deepEqual(at(p), [7, 16], "(8,16) is water");
    assert.equal(p.hero.feet.x + p.hero.feet.width, 8 * 16, "right up to its edge");
    assert.equal(p.hero.facing, "right");
});

test("a tree trunk blocks, but its canopy does not", () => {
    const p = play();
    // The trunk is drawn 8 px wide and ends 3 px above its tile's bottom edge, and it blocks where it is drawn. The hero's cell
    // starts 4 px higher than the tile, so its feet are well inside the trunk's rows (a hero that only grazes the base is nudged past).
    p.hero.teleport(3 * 16, 1 * 16 - 4, "left");
    hold(p, "left", 0.5);
    assert.equal(p.hero.feet.x, 2 * 16 + 12, "the trunk at (2,1) blocks, right up to its drawn edge, 4 px inside the tile");
    put(p, 3, 0, "left");
    hold(p, "left", 0.5);
    assert.ok(p.hero.feet.x < 2 * 16, "the canopy at (2,0) is open: the hero walks under it");
});

test("a character in the way blocks the hero", () => {
    const p = play();
    const npc = maps.places.town.npcs[0];
    put(p, npc.x - 1, npc.y, "right");
    hold(p, "right", 0.5);
    assert.deepEqual(at(p), [npc.x - 1, npc.y]);
    assert.equal(p.hero.feet.x + p.hero.feet.width, npc.x * 16, "right up to them");
    put(p, npc.x - 1, npc.y + 1, "right");
    hold(p, "right", 0.25);
    assert.deepEqual(at(p), [npc.x, npc.y + 1], "and the way around is open");
});

test("the hero cannot walk off the map", () => {
    const p = play();
    put(p, 0, 0, "left");
    hold(p, "left", 0.5);
    hold(p, "up", 0.5);
    assert.deepEqual(at(p), [0, 0]);
    assert.deepEqual([p.hero.feet.x, p.hero.feet.y], [0, 0], "right up to the edge");
});

test("the camera stays inside the world wherever the hero is", () => {
    const p = play();
    for (const [x, y] of [[0, 0], [19, 17], [10, 9], [0, 17], [19, 0]]) {
        put(p, x, y, "down");
        p.game.advance(frame);
        assert.ok(p.camera.x >= 0 && p.camera.x <= 320 - 240, `x at ${x},${y}: ${p.camera.x}`);
        assert.ok(p.camera.y >= 0 && p.camera.y <= 288 - 144, `y at ${x},${y}: ${p.camera.y}`);
    }
    put(p, 7, 7, "up");
    hold(p, "up", 0.6); // up to the door at (7,5)
    assert.equal(p.place(), "interior");
    p.game.advance(frame);
    assert.ok(p.camera.x >= 0 && p.camera.x <= 256 - 240 && p.camera.y >= 0 && p.camera.y <= 192 - 144, "inside, too");
});

// The hero's draw call: drawn on their tile, centred, and lifted by the height above it.
// What is drawn as a character, as against the ground (always first) and the things that stand on it.
// A raster is drawn as a canvas, so what stands on the ground is told apart from a character by where it is drawn.
const standing = (p, place = "town") => maps.mapDrawables(maps.places[place].map, "summer").standing;
const avatars = (p, ctx, place) => {
    const spots = new Set(standing(p, place).map((d) => `${d.x - p.camera.x},${d.y - p.camera.y}`));
    return ctx.draws.slice(1).filter(([, x, y]) => !spots.has(`${x},${y}`));
};
const heroDraw = (p, ctx) => ctx.draws.find(([raster, x, y]) => x === p.hero.x - p.camera.x + Math.floor((16 - raster.width) / 2) && y === p.hero.y - p.camera.y - 8);

function fakeContext() {
    const draws = [];
    return { draws, imageSmoothingEnabled: true, fillStyle: "", fillRect() {}, drawImage: (...a) => draws.push(a) };
}

test("a frame draws the ground, then what stands on it and the characters, with the hero among them in the right place", () => {
    const p = play();
    const ctx = fakeContext();
    p.game.advance(1);
    p.game.render(ctx);
    assert.equal(avatars(p, ctx).length, 2, "one character and the hero");
    const [, mx, my] = ctx.draws[0];
    assert.deepEqual([mx, my], [-p.camera.x, -p.camera.y]);
    assert.ok(ctx.draws.slice(1).every(([, x, y]) => Number.isInteger(x) && Number.isInteger(y)), "whole pixels");
    assert.ok(heroDraw(p, ctx), "the hero stands centred on their tile, lifted by the height above it");
});

test("whoever is further down the screen is drawn last", () => {
    const p = play();
    const npc = maps.places.town.npcs[0]; // (9, 8)
    put(p, npc.x, npc.y - 1, "down"); // just above the character
    p.game.advance(1);
    const ctx = fakeContext();
    p.game.render(ctx);
    const ys = avatars(p, ctx).map(([, , y]) => y);
    assert.deepEqual(ys, [...ys].sort((a, b) => a - b), "back to front");
    assert.equal(avatars(p, ctx).at(-1)[2], npc.y * 16 - p.camera.y - 8, "the character in front is last");
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
        p.game.advance(frame); // 14 frames is about half a stride
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
    for (let tries = 0; tries < 200 && new Set(avatars(p, ctx).map(([raster]) => raster.width)).size < 2; tries += 1) {
        p.randomize();
        ctx = fakeContext();
        p.game.render(ctx);
    }
    assert.ok(new Set(avatars(p, ctx).map(([raster]) => raster.width)).size >= 2, "the hero and a character are not the same width");
    for (const [raster, x] of avatars(p, ctx)) {
        const tileLeft = x - Math.floor((16 - raster.width) / 2);
        assert.equal(tileLeft % 16, (p.camera.x * -1) % 16 === 0 ? 0 : tileLeft % 16, "drawn relative to a tile edge");
        assert.ok(x + raster.width / 2 - tileLeft - 8 <= 1, "centred within a pixel");
    }
});

test("a tap shorter than one update still moves the hero, and turns them", () => {
    const p = play();
    const before = p.hero.y;
    p.game.input.press("down");
    p.game.input.release("down"); // lifted before the game ran
    for (let i = 0; i < 20; i += 1) p.game.advance(frame);
    assert.ok(p.hero.y > before && p.hero.y < before + 4, "a pixel or two down the path");
    assert.equal(p.hero.facing, "down");
});

test("A makes the character in front turn to face the hero", () => {
    const p = play();
    const npc = maps.places.town.npcs[0];
    assert.equal(p.facing(npc), "down", "characters start facing down");
    put(p, npc.x - 1, npc.y, "right"); // to the left of them, looking at them
    p.game.input.press("a");
    p.game.advance(frame);
    p.game.input.release("a");
    assert.equal(p.facing(npc), "left", "they turn toward the hero");
    put(p, npc.x + 1, npc.y, "left");
    p.game.input.press("a");
    p.game.advance(frame);
    p.game.input.release("a");
    p.game.advance(frame);
    assert.equal(p.facing(npc), "right", "and again from the other side");
});

test("A does nothing when nobody is in front", () => {
    const p = play();
    const npc = maps.places.town.npcs[0];
    put(p, npc.x - 1, npc.y, "left"); // looking away from them
    p.game.input.press("a");
    p.game.advance(frame);
    p.game.input.release("a");
    assert.equal(p.facing(npc), "down");
});

test("holding B runs: twice as far in the same time", () => {
    const distance = (running) => {
        const p = play();
        put(p, 12, 1, "right");
        const from = p.hero.x;
        if (running) p.game.input.press("b");
        p.game.input.press("right");
        for (let i = 0; i < 30; i += 1) p.game.advance(frame);
        return p.hero.x - from;
    };
    const walking = distance(false);
    const running = distance(true);
    assert.ok(walking >= 31 && walking <= 33, `walked ${walking}px in half a second: 64 a second`);
    assert.ok(running >= 62 && running <= 66, `ran ${running}px`);
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
    // The war-torn palette is not a season: START never lands on it, and leaves it for spring.
    const r = play({ theme: "ash" });
    r.game.input.press("start");
    r.game.advance(frame);
    assert.equal(r.options.theme, "spring");
    for (let i = 0; i < 8; i += 1) {
        r.game.input.release("start");
        r.game.advance(frame);
        r.game.input.press("start");
        r.game.advance(frame);
        assert.notEqual(r.options.theme, "ash");
    }
});

test("the handheld view is 160 by 144, a classic handheld's screen, and the world still fits it", () => {
    assert.deepEqual({ ...maps.HANDHELD_VIEW }, { width: 160, height: 144 });
    assert.deepEqual({ ...maps.DESKTOP_VIEW }, { width: 240, height: 144 });
    const p = play({ theme: "summer" }, maps.HANDHELD_VIEW);
    assert.deepEqual({ ...p.view }, { width: 160, height: 144 });
    assert.equal(p.camera.width, 160);
    for (const [x, y] of [[0, 0], [19, 17], [10, 9]]) {
        put(p, x, y, "down");
        p.game.advance(frame);
        assert.ok(p.camera.x >= 0 && p.camera.x <= 320 - 160, `x at ${x},${y}: ${p.camera.x}`);
        assert.ok(p.camera.y >= 0 && p.camera.y <= 288 - 144, `y at ${x},${y}: ${p.camera.y}`);
    }
    const ctx = fakeContext();
    p.game.render(ctx);
    assert.equal(avatars(p, ctx).length, 2, "the same character and hero");
});

test("the world works at any view width a phone produces, not only whole tiles", () => {
    // 2x zoom fills 360, 390, 412, 430 and 480 px; 3x fills 540 to 720 px. Both keep the view at 240 px or less.
    for (const screen of [360, 390, 412, 430, 480]) {
        const view = { width: Math.floor(screen / 2), height: 144 };
        const p = play({ theme: "summer" }, view);
        assert.equal(p.camera.width, view.width);
        for (const [x, y] of [[0, 0], [19, 17], [10, 9], [0, 17], [19, 0]]) {
            put(p, x, y, "down");
            p.game.advance(frame);
            assert.ok(p.camera.x >= 0 && p.camera.x <= 320 - view.width, `${screen}px, x at ${x},${y}: ${p.camera.x}`);
        }
        put(p, 7, 7, "up");
        hold(p, "up", 0.6); // through the door
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
    put(p, 7, 8, "up");
    hold(p, "up", 0.25);
    assert.deepEqual(at(p), [7, 7], "the hero still walks");
});
