import assert from "node:assert/strict";
import test from "node:test";
import {
    TILE_SIZE, colorRamps, buildBuilding, buildMap, buildingBox, buildingColors, buildingFootprint, buildingMap, buildingProps, buildingStoreys, buildingWalls, buildingWidths,
    chimneys, defaultBuildingConfig, defineMap, doorPositions, doorStyles, porches, queryCell, randomBuilding, resolveBuildingConfig, roofPitches, roofShapes,
    townTileset, windowCounts, windowStyles
} from "../dist/index.js";

// Pixel values index each raster's own colour list, so compare the colours themselves.
const paint = (r) => [...r.px].map((i) => r.colors[i]);

test("every choice draws a building a whole number of tiles wide and tall, standing on the bottom row", () => {
    const lists = { width: buildingWidths, storeys: buildingStoreys, roof: roofShapes, pitch: roofPitches, wall: buildingWalls, door: doorPositions, doorStyle: doorStyles, windows: windowCounts, windowStyle: windowStyles, porch: porches, chimney: chimneys, props: buildingProps };
    for (const [field, options] of Object.entries(lists)) {
        for (const option of options) {
            const config = { [field]: option };
            const raster = buildBuilding(config);
            const box = buildingBox(config);
            assert.equal(raster.width, box.width * TILE_SIZE, JSON.stringify(config));
            assert.equal(raster.height, box.height * TILE_SIZE, JSON.stringify(config));
            // The building is painted on the bottom row (its ground line) and nothing touches the picture's own corners.
            assert.ok(paint(raster).slice(-raster.width).some((c) => c !== ""), JSON.stringify(config));
            assert.equal(raster.px[0], 0);
            assert.equal(raster.px[raster.width - 1], 0);
        }
    }
});

test("random buildings are valid, repeatable, and every one draws and fits on a map", () => {
    assert.deepEqual(randomBuilding(7), randomBuilding(7));
    for (let seed = 0; seed < 200; seed += 1) {
        const config = randomBuilding(seed);
        assert.deepEqual(resolveBuildingConfig(config), config);
        const raster = buildBuilding(config);
        assert.ok(raster.colors.length > 6);
        buildMap(buildingMap(config));
    }
});

test("a building is the same object each time, and its choices change the picture", () => {
    assert.equal(buildBuilding({ roofColor: "blue" }), buildBuilding({ roofColor: "blue" }));
    const base = paint(buildBuilding({}));
    for (const change of [{ roofColor: "green" }, { wallColor: "pink" }, { trimColor: "white" }, { doorColor: "red" }, { wall: "brick" }, { wall: "stone" }, { wall: "timber" }, { roof: "gable" },
        { chimney: "left" }, { props: "barrels" }, { props: "planters" }, { porch: "deck" }, { windows: "none" }, { windowStyle: "arched" }, { doorStyle: "arched" }]) {
        assert.notDeepEqual(paint(buildBuilding(change)), base, JSON.stringify(change));
    }
    assert.notDeepEqual(paint(buildBuilding({ roofColor: "#336699" })), base);
    // A taller building has more rows, a steeper roof too, and a wider one more columns.
    assert.equal(buildingBox({ storeys: 2 }).height, buildingBox({}).height + 2);
    assert.equal(buildingBox({ pitch: "steep" }).height, buildingBox({}).height + 1);
});

test("a roof is seen from above: both slopes show, the left lit and the right in shade, and it is taller than the wall's top edge", () => {
    for (const roof of roofShapes) {
        for (const pitch of roofPitches) {
            const config = { roof, pitch, roofColor: "red" };
            const raster = buildBuilding(config);
            const rows = (buildingBox(config).roofTiles) * TILE_SIZE;
            const count = (from, to, colour) => {
                let n = 0;
                for (let y = 0; y < rows; y += 1) for (let x = from; x < to; x += 1) if (raster.colors[raster.px[y * raster.width + x]] === colour) n += 1;
                return n;
            };
            const half = raster.width / 2;
            const base = colorRamps.red.base;
            // A gable is two big slopes; a hip is mostly one front slope, with the left and right ones as narrow faces beside it.
            assert.ok(count(0, half, base) > count(half, raster.width, base) * (roof === "gable" ? 1.5 : 1), `${roof} ${pitch}: left side is lit`);
            assert.ok(count(half, raster.width, colorRamps.red.shadow) > count(0, half, colorRamps.red.shadow), `${roof} ${pitch}: right side is in shade`);
            // The roof reaches the top of the picture, so it is not just a front slope the height of the wall.
            assert.ok(raster.px.slice(0, raster.width * 4).some((p) => p !== 0), `${roof} ${pitch}: reaches the top`);
        }
    }
});

test("nothing on the facade touches the roof or the shadow under its eave", () => {
    const facade = { door: "left", doorStyle: "arched", windows: "many", windowStyle: "shuttered", porch: "deck", props: "planters" };
    const bare = { door: "right", doorStyle: "plain", windows: "none", windowStyle: "plain", porch: "none", props: "none" };
    for (const roof of roofShapes) {
        for (const pitch of roofPitches) {
            for (const storeys of buildingStoreys) {
                for (const width of buildingWidths) {
                    for (const wall of buildingWalls) {
                        const config = { roof, pitch, storeys, width, wall };
                        const box = buildingBox(config);
                        // The roof, its edge and the shadow it casts on the wall are the first rows of the wall, then a gap before anything on the wall.
                        const rows = box.roofTiles * TILE_SIZE + 7;
                        const above = (extra) => paint(buildBuilding({ ...config, ...extra })).slice(0, rows * box.width * TILE_SIZE);
                        // A gable has a round window of its own whenever the house has windows, so it is compared with a house that has some.
                        assert.deepEqual(above(facade), above({ ...bare, ...(roof === "gable" ? { windows: "some" } : {}) }), JSON.stringify(config));
                    }
                }
            }
        }
    }
});

test("unknown values fall back to the defaults and bad colours are dropped", () => {
    const resolved = resolveBuildingConfig({ width: 99, storeys: "2", roof: "toString", pitch: "__proto__", wall: "glass", door: "up", windows: 7, porch: null, roofColor: "javascript:1", wallColor: "#ABC", trimColor: "nope", doorColor: 5 });
    assert.deepEqual(resolved, { ...defaultBuildingConfig, wallColor: "#aabbcc" });
    assert.deepEqual(resolveBuildingConfig(), defaultBuildingConfig);
    assert.equal(resolveBuildingConfig({ roofColor: "teal" }).roofColor, "teal");
    assert.ok(buildingColors.includes("brown") && buildingColors.includes("white"));
});

test("a building's walls and roof are solid and its door is the one open cell at its foot", () => {
    for (const door of doorPositions) {
        const config = { width: 6, storeys: 2, pitch: "steep", door };
        const box = buildingBox(config);
        const footprint = buildingFootprint(config);
        assert.equal(footprint.length, box.height);
        assert.ok(footprint.every((row) => row.length === box.width));
        const cells = footprint.join("");
        assert.equal([...cells].filter((c) => c === "D").length, 1);
        assert.equal(footprint[box.height - 1].indexOf("D"), { left: 1, centre: 2, right: 4 }[door]);

        const map = defineMap(townTileset, ["gggggggg", "gggggggg", "gggggggg", "gggggggg", "gggggggg", "gggggggg", "gggggggg"], [], [{ config, x: 3, y: 2 }]);
        const doorX = 3 + footprint[box.height - 1].indexOf("D");
        const doorY = 2 + box.height - 1;
        const cell = queryCell(map, doorX, doorY);
        assert.equal(cell.door, true);
        assert.equal(cell.solid, false);
        assert.equal(cell.building, map.buildings[0]);
        assert.equal(queryCell(map, doorX, doorY + 1).solid, false);
        assert.equal(queryCell(map, doorX, doorY + 1).building, undefined);
        assert.equal(queryCell(map, 3, 2).solid, true);
        assert.equal(queryCell(map, 3 + box.width - 1, doorY).solid, true);
        assert.equal(queryCell(map, 3 + box.width, doorY).solid, false);
    }
});

test("a map rejects buildings that do not fit or that overlap", () => {
    const rows = Array(8).fill("gggggggggg");
    const building = { config: { width: 5 }, x: 2, y: 1 };
    assert.throws(() => defineMap(townTileset, rows, [], [{ config: { width: 5 }, x: 16, y: 1 }]), /does not fit/);
    assert.throws(() => defineMap(townTileset, rows, [], [{ config: { width: 5 }, x: 0, y: 14 }]), /does not fit/);
    assert.throws(() => defineMap(townTileset, rows, [], [{ config: { width: 5 }, x: 0.5, y: 1 }]), /does not fit/);
    assert.throws(() => defineMap(townTileset, rows, [], [building, { ...building, x: 4 }]), /overlaps/);
    assert.throws(() => defineMap(townTileset, rows, [{ id: "tree", x: 3, y: 4 }], [building]), /overlaps/);
    // Beside it is fine, and a flower (a ground object) may sit at its foot.
    defineMap(townTileset, rows, [{ id: "tree", x: 0, y: 4 }, { id: "flower", x: 3, y: 2 }], [building]);
});

test("a map draws its buildings pixel for pixel on top of the terrain", () => {
    const rows = Array(8).fill("gggggggggg");
    const building = { config: { width: 5, roofColor: "blue" }, x: 3, y: 2 };
    const plain = buildMap(defineMap(townTileset, rows));
    const withHouse = buildMap(defineMap(townTileset, rows, [], [building]));
    const house = buildBuilding(building.config);
    const at = (r, x, y) => r.colors[r.px[y * r.width + x]];
    let matches = 0;
    for (let y = 0; y < house.height; y += 1) {
        for (let x = 0; x < house.width; x += 1) {
            if (house.px[y * house.width + x] !== 0) {
                assert.equal(at(withHouse, 3 * TILE_SIZE + x, 2 * TILE_SIZE + y), house.colors[house.px[y * house.width + x]]);
                matches += 1;
            }
        }
    }
    assert.ok(matches > 1000);
    assert.notDeepEqual(paint(plain), paint(withHouse));
});

test("object colours change the picture, and only valid colours are accepted", () => {
    assert.throws(() => defineMap(townTileset, ["gg"], [{ id: "door", x: 0, y: 0, color: "nope" }]), /cannot be coloured/);
    assert.throws(() => defineMap(townTileset, ["gg"], [{ id: "counter", x: 0, y: 0, color: "red" }]), /cannot be coloured/);
    // A short hex colour is stored as #rrggbb.
    assert.equal(defineMap(townTileset, ["gg"], [{ id: "door", x: 0, y: 0, color: "#ABC" }]).objects[0].color, "#aabbcc");
    const door = (color) => paint(buildMap(defineMap(townTileset, ["gg"], [{ id: "door", x: 0, y: 0, color }])));
    assert.notDeepEqual(door("red"), door(undefined));
});
