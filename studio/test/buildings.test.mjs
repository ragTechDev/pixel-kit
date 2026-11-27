// A building placed on a map keeps a walker out of its walls and lets it onto the door cell. The sprites package
// owns the map data and the engine owns the walking, so this is where the two are tested together.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test, { before } from "node:test";
import { build } from "esbuild";

const src = (pkg, file) => fileURLToPath(new URL(`../../packages/${pkg}/src/${file}`, import.meta.url));

let lib;

before(async () => {
    // One bundle holds both packages, so the walker and the map share a single copy of the library.
    const both = await build({
        stdin: { contents: `export * from "@ragtechdev/pixel-sprites"; export { isWalkable } from ${JSON.stringify(src("pixel-engine", "index.ts"))};`, resolveDir: fileURLToPath(new URL(".", import.meta.url)) },
        bundle: true, format: "esm", write: false, platform: "node", alias: { "@ragtechdev/pixel-sprites": src("pixel-sprites", "index.ts") }, external: ["react"]
    });
    lib = await import(`data:text/javascript;base64,${Buffer.from(both.outputFiles[0].text).toString("base64")}`);
});

test("a walker cannot enter a building's walls or roof, and can step onto the door cell", () => {
    const { defineMap, townTileset, buildingBox, buildingFootprint, isWalkable } = lib;
    const config = { width: 6, storeys: 2, door: "centre" };
    const map = defineMap(townTileset, Array(8).fill("gggggggg"), [], [{ config, x: 3, y: 2 }]);
    const box = buildingBox(config);
    const footprint = buildingFootprint(config);
    const doorX = 3 + footprint[box.height - 1].indexOf("D");
    const doorY = 2 + box.height - 1;

    for (let y = 0; y < box.height; y += 1) {
        for (let x = 0; x < box.width; x += 1) {
            const isDoor = x + 3 === doorX && y + 2 === doorY;
            assert.equal(isWalkable(map, 3 + x, 2 + y), isDoor, `(${3 + x}, ${2 + y})`);
        }
    }
    // The door cell counts as open without any special option, and the ground in front of it is open too.
    assert.equal(isWalkable(map, doorX, doorY + 1), true);
    assert.equal(isWalkable(map, 2, 2), true);
    assert.equal(isWalkable(map, 3 + box.width, 2), true);
});
