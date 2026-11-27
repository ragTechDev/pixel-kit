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
            contents: `export * from "./src/play/game"; export * from "./src/play/maps"; import { paintRaster } from "@ragtechdev/pixel-sprites/canvas"; export { paintRaster }; export { buildIcon, toVariant, buildObject, doorBoxes, mapDrawables, solidBoxes } from "@ragtechdev/pixel-sprites";`,
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

test("the hero starts on the path in the town, facing the viewer", () => {
    const p = play();
    assert.equal(p.place(), "town");
    assert.deepEqual(at(p), [7, 8]);
    assert.equal(p.hero.facing, "down");
});

test("walking up the path to the door goes inside, and walking down out of the door comes back", () => {
    const p = play();
    hold(p, "up", 0.5);
    assert.equal(p.place(), "town", "still short of the door");
    holdThroughDoor(p, "up"); // onto the door at (7,5)
    assert.equal(p.place(), "restaurant", "the door warps");
    assert.deepEqual(at(p), [7, 10], "arriving just inside the gap in the near wall");
    assert.equal(p.hero.facing, "up");
    holdThroughDoor(p, "down"); // through the gap in the near wall, at (7,11)
    assert.equal(p.place(), "town");
    assert.deepEqual(at(p), [7, 6], "back in front of the house door");
    assert.equal(p.hero.facing, "down");
});

test("a grocer's stands on the pavement: its door leads in, and the way out puts the hero back in front of it", () => {
    const p = play();
    put(p, 12, 13, "up");
    holdThroughDoor(p, "up"); // onto the grocer door at (12,12)
    assert.equal(p.place(), "grocer");
    assert.deepEqual(at(p), [7, 10], "arriving just inside the gap in the near wall");
    holdThroughDoor(p, "down");
    assert.equal(p.place(), "town");
    assert.deepEqual(at(p), [12, 13], "on the pavement in front of the grocer door, not at the restaurant");
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

test("the hero cannot walk onto the water part of the shore, only the grass and sand above it", () => {
    const p = play();
    // The shore row at y = 14 is grass, then sand, then water from its pixel row 9.
    put(p, 9, 12, "down"); // grass beside the grocer
    hold(p, "down", 2);
    assert.equal(p.hero.feet.y + p.hero.feet.height, 14 * 16 + 9, "stopped at the edge of the water, on the sand");
    hold(p, "right", 1);
    assert.equal(p.hero.feet.y + p.hero.feet.height, 14 * 16 + 9, "and can walk along the shore");
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
    p.hero.teleport(17 * 16, 11 * 16 - 4, "left");
    hold(p, "left", 0.5);
    assert.equal(p.hero.feet.x, 16 * 16 + 12, "the trunk at (16,11) blocks, right up to its drawn edge, 4 px inside the tile");
    put(p, 17, 10, "left");
    hold(p, "left", 0.5);
    assert.ok(p.hero.feet.x < 16 * 16, "the canopy at (16,10) is open: the hero walks under it");
});

test("a fruit tree blocks only its foot, and a row of a field can be walked along", () => {
    const p = play();
    // The apple tree at (0,0) is 2 by 3 tiles: its crown rows are open and its bottom row, (0,2) and (1,2), is solid.
    put(p, 3, 0, "left");
    hold(p, "left", 0.5);
    assert.ok(p.hero.feet.x < 2 * 16 && p.hero.feet.x >= 0, "the crown at (2,0) is open");
    p.hero.teleport(3 * 16, 5 * 16 - 4, "left");
    hold(p, "left", 0.5);
    assert.ok(p.hero.feet.x >= 2 * 16, "the foot of the tree at (2,3) blocks");
    // The tilled row between the crops is open, so the hero walks along the field.
    put(p, 5, 11, "left");
    hold(p, "left", 2);
    assert.deepEqual(at(p), [0, 11], "along the whole open row");
});

test("crops block only their base: the hero walks in behind a tomato's leaves, between plants and along the back of the row", () => {
    const p = play();
    // The tomato at (1,12): the hero walks in under its leaves and stops flush against its base.
    put(p, 1, 11, "down");
    hold(p, "down", 1);
    const base = maps.solidBoxes(p.map()).find((b) => b.x >= 16 && b.x < 32 && b.y >= 12 * 16 && b.y < 13 * 16);
    assert.ok(base && base.height <= 8, "the box is just the foot of the plant");
    assert.equal(p.hero.feet.y + p.hero.feet.height, base.y, "right up to where its base is drawn");
    assert.ok(p.hero.feet.y > 12 * 16 - 8, "which is inside the plant's own tile, behind its leaves");
    // The empty tile at (3,12) between the tomatoes and the corn is a way through.
    put(p, 3, 11, "down");
    hold(p, "down", 1.5);
    assert.ok(p.hero.y >= 13 * 16 - 4, "walked between the tomatoes and the corn and out the other side, to the water's edge");
    // Behind the row, the whole way along it.
    p.hero.teleport(5 * 16, 12 * 16 - 8, "left");
    hold(p, "left", 2);
    assert.equal(p.hero.feet.x, 0, "behind carrot, tomatoes and corn alike, all the way to the map edge");
});

const tap = (p, action) => {
    p.game.input.press(action);
    p.game.advance(frame);
    p.game.input.release(action);
    p.game.advance(frame);
};
const wait = (p, seconds) => {
    for (let i = 0; i < Math.round(seconds / frame); i += 1) p.game.advance(frame);
};

test("A in front of a crop picks it: the hero holds the vegetable, and the crop is gone from the field", () => {
    const p = play();
    put(p, 0, 9, "down");
    assert.equal(p.carrying(), undefined);
    tap(p, "a");
    assert.equal(p.carrying(), "veg_carrot", "the carrot at (0,10) is picked");
    assert.equal(p.map().objects.some((o) => o.id === "crop_carrot" && o.x === 0 && o.y === 10), false, "and is gone from the soil");
    // The hero stands still while picking it up, then walks off holding it.
    const before = p.hero.x;
    p.game.input.press("right");
    for (let i = 0; i < 20; i += 1) p.game.advance(frame);
    assert.equal(p.hero.x, before, "still bending down");
    wait(p, 1);
    hold(p, "right", 0.2);
    assert.ok(p.hero.x > before, "free to walk once it is held");
    assert.equal(p.carrying(), "veg_carrot");
});

test("picking from a tomato or corn plant takes one, and the bare plant stays when none are left", () => {
    const p = play();
    const plant = (id, x) => p.map().objects.find((o) => o.id === id && o.x === x && o.y === 12);
    // The tomato at (1,12) carries 3. Each pick takes one; put it down to pick again.
    const pick = () => {
        put(p, 1, 11, "down");
        hold(p, "down", 1);
        tap(p, "a");
        wait(p, 1.2);
    };
    const putDown = () => {
        put(p, 8, 14, "right");
        tap(p, "a");
    };
    assert.equal(plant("crop_tomato", 1).count, 3);
    pick();
    assert.equal(p.carrying(), "veg_tomato", "a tomato is picked");
    assert.equal(plant("crop_tomato", 1).count, 2, "and two are left");
    assert.notEqual(plant("crop_tomato", 1).bearing, "none");
    putDown();
    pick();
    assert.equal(plant("crop_tomato", 1).count, 1);
    putDown();
    pick();
    assert.ok(plant("crop_tomato", 1), "the plant is still there");
    assert.deepEqual([plant("crop_tomato", 1).count, plant("crop_tomato", 1).bearing], [0, "none"], "bare once the last is gone");
    putDown();
    assert.equal(p.carrying(), undefined);
    put(p, 1, 11, "down");
    hold(p, "down", 1);
    tap(p, "a");
    assert.equal(p.carrying(), undefined, "a bare plant gives nothing");
    // Corn is the same: the plant at (4,12) carries 2 cobs.
    put(p, 4, 11, "down");
    hold(p, "down", 1);
    tap(p, "a");
    assert.equal(p.carrying(), "veg_corn");
    assert.equal(plant("crop_corn", 4).count, 1);
    assert.notEqual(plant("crop_corn", 4).bearing, "none");
    // A carrot is taken up whole.
    put(p, 0, 9, "down");
    wait(p, 1.2);
    tap(p, "a");
    assert.equal(p.map().objects.some((o) => o.id === "crop_carrot" && o.x === 0 && o.y === 10), true, "hands are full, so the carrot stays");
});

test("a held vegetable is drawn with the hero, over its head while it is lifted", () => {
    const p = play();
    put(p, 0, 9, "down");
    tap(p, "a");
    const carrot = maps.buildObject("veg_carrot");
    const picture = maps.paintRaster(carrot);
    const drawn = () => {
        const ctx = fakeContext();
        p.game.render(ctx);
        return { hero: heroDraw(p, ctx), item: ctx.draws.find(([canvas]) => canvas === picture) };
    };
    wait(p, 0.7);
    let { hero, item } = drawn();
    assert.ok(item[2] + carrot.height <= hero[2] + 4, "the vegetable is above the avatar's head");
    wait(p, 1);
    ({ hero, item } = drawn());
    assert.ok(item[2] > hero[2], "and is then carried lower, in front of the body");
});

test("hands full: A does not pick up a second thing, and A with nothing in front puts it down", () => {
    const p = play();
    put(p, 0, 9, "down");
    tap(p, "a");
    wait(p, 1.2);
    put(p, 1, 9, "down");
    tap(p, "a");
    assert.equal(p.carrying(), "veg_carrot", "still holding the carrot");
    assert.equal(p.map().objects.some((o) => o.id === "crop_radish"), true, "the radish stays in the field");
    put(p, 8, 14, "right");
    tap(p, "a");
    assert.equal(p.carrying(), undefined, "put down");
});

test("A under a tree that bears fruit picks one, and the tree carries one fewer", () => {
    const p = play();
    put(p, 0, 7, "up");
    hold(p, "up", 1);
    const orange = () => p.map().objects.find((o) => o.id === "fruit_tree" && o.x === 0 && o.y === 3);
    assert.equal(orange().count, 5, "the orange tree carries five");
    tap(p, "a");
    assert.equal(p.carrying(), "fruit_orange", "the orange tree at (0,3) is bearing fruit");
    assert.deepEqual([orange().bearing, orange().count, orange().crop], ["fruit", 4, "orange"]);
    wait(p, 1.2);
    tap(p, "a");
    assert.equal(orange().count, 4, "hands are full, so it keeps its four");
    // Put the orange down, then pick the rest: the tree is bare after the last.
    for (let left = 4; left > 0; left -= 1) {
        put(p, 8, 14, "right");
        tap(p, "a");
        put(p, 0, 7, "up");
        hold(p, "up", 1);
        tap(p, "a");
        wait(p, 1.2);
        assert.equal(orange().count, left - 1);
    }
    assert.equal(orange().bearing, "none", "bare once the last is picked");
    put(p, 8, 14, "right");
    tap(p, "a");
    put(p, 0, 7, "up");
    hold(p, "up", 1);
    tap(p, "a");
    assert.equal(p.carrying(), undefined, "and it gives nothing more");
});

test("a tree in blossom or still young gives nothing", () => {
    const p = play();
    // The cherry at (2,0) is in flower: stand under its crown with its trunk in front.
    p.hero.teleport(2 * 16, 45, "up");
    tap(p, "a");
    assert.equal(p.carrying(), undefined, "blossom is not fruit");
    // The pear at (2,3) is young.
    put(p, 2, 7, "up");
    hold(p, "up", 1);
    tap(p, "a");
    assert.equal(p.carrying(), undefined, "a young tree bears nothing");
});

test("speaking to a character puts a comment over them for a moment, and a heart (giving what the hero holds) if they are holding something", () => {
    const p = play();
    const npc = maps.places.town.npcs[0];
    const small = (icon) => maps.paintRaster(maps.toVariant(icon, { size: 16 }));
    const comment = small(maps.buildIcon("comment"));
    const heart = small(maps.buildIcon("heart", { color: "red" }));
    const drawn = (canvas) => {
        const ctx = fakeContext();
        p.game.render(ctx);
        return ctx.draws.find(([c]) => c === canvas);
    };
    put(p, npc.x - 1, npc.y, "right");
    p.game.advance(frame);
    assert.equal(drawn(comment), undefined, "nothing before they are spoken to");
    tap(p, "a");
    const popup = drawn(comment);
    assert.ok(popup, "a comment appears");
    assert.equal(drawn(heart), undefined, "and not a heart");
    // It sits over the character: centred on them and above their head.
    const spot = (npc.x + 0.5) * 16 - p.camera.x;
    assert.ok(Math.abs(popup[1] + popup[3] / 2 - spot) <= 6, "centred over the character");
    assert.ok(popup[2] + popup[4] <= npc.y * 16 - p.camera.y - 8 + 6, "above their head");
    // Speaking again restarts it rather than adding another.
    tap(p, "a");
    const ctx = fakeContext();
    p.game.render(ctx);
    assert.equal(ctx.draws.filter(([c]) => c === comment).length, 1);
    wait(p, 1.5);
    assert.equal(drawn(comment), undefined, "gone after a moment");
    // Holding a vegetable, the same press shows a heart.
    put(p, 0, 9, "down");
    tap(p, "a");
    wait(p, 1.2);
    assert.equal(p.carrying(), "veg_carrot");
    put(p, npc.x - 1, npc.y, "right");
    tap(p, "a");
    assert.ok(drawn(heart), "a heart appears");
    assert.equal(drawn(comment), undefined, "instead of the comment");
    assert.equal(p.carrying(), undefined, "and the carrot is given away: it is gone from their hands");
    wait(p, 1.5);
    assert.equal(drawn(heart), undefined, "gone after a moment");
});

test("a popup does not follow the hero through a door", () => {
    const p = play();
    const npc = maps.places.town.npcs[0];
    put(p, npc.x - 1, npc.y, "right");
    tap(p, "a");
    holdThroughDoor(p, "up");
    p.hero.teleport(7 * 16, 5 * 16);
    const comment = maps.paintRaster(maps.toVariant(maps.buildIcon("comment"), { size: 16 }));
    const ctx = fakeContext();
    p.game.render(ctx);
    assert.equal(ctx.draws.filter(([c]) => c === comment).length, 0);
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
    assert.equal(p.place(), "restaurant");
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
    put(p, 7, 8, "up"); // the hero starts facing down, and the walk is up
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
        assert.equal(p.place(), "restaurant");
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

test("every character stands on open floor, and every door has open floor in front of it, in each place", () => {
    for (const place of Object.values(maps.places)) {
        const solid = maps.solidBoxes(place.map);
        const blocked = (tx, ty) => solid.some((b) => 16 * tx + 8 >= b.x && 16 * tx + 8 < b.x + b.width && 16 * ty + 8 >= b.y && 16 * ty + 8 < b.y + b.height);
        for (const npc of place.npcs) assert.equal(blocked(npc.x, npc.y), false, `${place.id}: a character at (${npc.x}, ${npc.y}) is inside something`);
        assert.equal(blocked(place.arrive.x, place.arrive.y), false, `${place.id}: arriving at (${place.arrive.x}, ${place.arrive.y})`);
    }
});

test("the hero can walk behind the counter, into the kitchen and to the grocer's shelves behind the till", () => {
    // A search over the tiles the hero's feet fit on, from where it arrives: whatever it reaches, a player can walk to.
    for (const [id, behind] of [["restaurant", [[6, 3], [4, 3]]], ["grocer", [[5, 4], [6, 4], [8, 4], [8, 3]]]]) {
        const place = maps.places[id];
        const p = play();
        const solid = maps.solidBoxes(place.map);
        const free = (tx, ty) => {
            p.hero.teleport(tx * 16, ty * 16, "down");
            const f = p.hero.feet;
            const hit = (b) => f.x < b.x + b.width && f.x + f.width > b.x && f.y < b.y + b.height && f.y + f.height > b.y;
            return tx >= 0 && ty >= 0 && tx < 16 && ty < 12 && !solid.some(hit) && !place.npcs.some((n) => n.x === tx && n.y === ty);
        };
        const seen = new Set([`${place.arrive.x},${place.arrive.y}`]);
        const queue = [[place.arrive.x, place.arrive.y]];
        for (let i = 0; i < queue.length; i += 1) {
            const [x, y] = queue[i];
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const key = `${x + dx},${y + dy}`;
                if (!seen.has(key) && free(x + dx, y + dy)) {
                    seen.add(key);
                    queue.push([x + dx, y + dy]);
                }
            }
        }
        for (const [x, y] of behind) assert.ok(seen.has(`${x},${y}`), `${id}: (${x}, ${y}) can be reached on foot`);
    }
});

test("a room's walls: thin at the sides, a little thicker along the front, and a gap in the front wall is the way out", () => {
    const p = play();
    put(p, 7, 6, "up");
    holdThroughDoor(p, "up");
    assert.equal(p.place(), "restaurant");
    // The side walls are 8 pixels thick, seen from above: the hero walks right up to them, not a whole tile away.
    put(p, 5, 10, "left");
    hold(p, "left", 2);
    assert.equal(p.hero.feet.x, 8, "against the left wall");
    put(p, 5, 10, "right");
    hold(p, "right", 4);
    assert.equal(p.hero.feet.x + p.hero.feet.width, 16 * 16 - 8, "against the right wall");
    // The near wall's top starts 2 pixels into its tile, so the hero stops just in front of it.
    put(p, 3, 10, "down");
    hold(p, "down", 1);
    assert.equal(p.place(), "restaurant");
    assert.equal(p.hero.feet.y + p.hero.feet.height, 11 * 16 + 2, "against the near wall");
    // Through the gap, there is no door: the hero just walks out.
    put(p, 7, 10, "down");
    holdThroughDoor(p, "down");
    assert.equal(p.place(), "town");
});
