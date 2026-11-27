// The studio's sample maps are built from the real source, in every palette. A map that does not fit (a tree on a
// building, a block that is not in the tileset) throws as soon as it is defined, so this is what catches it.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test, { before } from "node:test";
import { build } from "esbuild";

const src = (pkg, file) => fileURLToPath(new URL(`../../packages/${pkg}/src/${file}`, import.meta.url));
const aliases = { "@ragtechdev/pixel-sprites": src("pixel-sprites", "index.ts") };

let worlds;
let lib;

before(async () => {
    const bundle = await build({
        stdin: {
            contents: `export { worlds } from "./src/worlds"; export { buildMap, tileThemes, queryCell, buildingFootprint } from "@ragtechdev/pixel-sprites";`,
            resolveDir: fileURLToPath(new URL("..", import.meta.url)),
            loader: "ts"
        },
        bundle: true,
        write: false,
        format: "esm",
        platform: "node",
        logLevel: "silent",
        plugins: [{ name: "source-aliases", setup(b) { b.onResolve({ filter: /^@ragtechdev\// }, (args) => (aliases[args.path] ? { path: aliases[args.path] } : undefined)); } }]
    });
    lib = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
    worlds = lib.worlds;
});

test("every sample map builds in every palette, wartorn included", () => {
    assert.deepEqual(Object.keys(worlds), ["Town", "House", "Street", "Ruins"]);
    for (const [name, map] of Object.entries(worlds)) {
        for (const theme of lib.tileThemes) {
            const raster = lib.buildMap(map, theme);
            assert.equal(raster.width, map.width * 2 * 16, `${name} in ${theme}`);
        }
    }
});

test("the Ruins map is damaged ground with half and wholly ruined buildings and burnt things, and the street can be walked along", () => {
    const ruins = worlds.Ruins;
    const damages = [...ruins.buildings.map((b) => b.config.damage), ...ruins.objects.map((o) => o.damage)];
    assert.ok(damages.includes("half") && damages.includes("ruin"));
    assert.ok(ruins.buildings.every((b) => b.config.damage === "half" || b.config.damage === "ruin"));
    // The pavement and the road are open end to end, with nothing standing on them.
    for (let x = 0; x < ruins.width * 2; x += 1) for (const y of [10, 11, 12, 13, 14, 15]) assert.equal(lib.queryCell(ruins, x, y).solid, false, `(${x}, ${y})`);
});
