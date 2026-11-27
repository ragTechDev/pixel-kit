import assert from "node:assert/strict";
import test from "node:test";
import {
    TILE_SIZE, colorRamps, buildBuilding, buildMap, buildingDepths, buildingWings, buildingRooftops, buildingBox, buildingColors, buildingFootprint, buildingMap, buildingProps, buildingStoreys, buildingWalls, buildingWidths,
    chimneys, defaultBuildingConfig, defineMap, doorPositions, doorStyles, porches, queryCell, randomBuilding, resolveBuildingConfig, roofPitches, roofShapes,
    townTileset, windowCounts, windowStyles
} from "../dist/index.js";

// Pixel values index each raster's own colour list, so compare the colours themselves.
const paint = (r) => [...r.px].map((i) => r.colors[i]);
// The row (in pixels) where the lower part of a side wing starts: the taller part is two storeys, the lower one, with the roof it gets, one.
const lowerRoof = { gable: "gable", hip: "hip", hipFlat: "hip", mansard: "hip", gambrel: "gable", saltbox: "gable", flat: "flat" };
const lowTopOf = (roof, width = 8) => (buildingBox({ roof, width, wing: "left", storeys: 1 }).height - buildingBox({ roof: lowerRoof[roof], width, storeys: 1 }).height) * TILE_SIZE;

test("every choice draws a building a whole number of tiles wide and tall, standing on the bottom row", () => {
    const lists = { width: buildingWidths, storeys: buildingStoreys, roof: roofShapes, wing: buildingWings, pitch: roofPitches, depth: buildingDepths, rooftop: buildingRooftops, wall: buildingWalls, door: doorPositions, doorStyle: doorStyles, windows: windowCounts, windowStyle: windowStyles, porch: porches, chimney: chimneys, props: buildingProps };
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
    for (const change of [{ roofColor: "green" }, { wallColor: "pink" }, { trimColor: "white" }, { doorColor: "red" }, { wall: "brick" }, { wall: "stone" }, { wall: "timber" }, { roof: "hip" }, { roof: "flat" }, { wing: "front" }, { wing: "left" },
        { chimney: "left" }, { props: "barrels" }, { props: "planters" }, { porch: "deck" }, { windows: "none" }, { windowStyle: "arched" }, { doorStyle: "arched" }]) {
        assert.notDeepEqual(paint(buildBuilding(change)), base, JSON.stringify(change));
    }
    assert.notDeepEqual(paint(buildBuilding({ roofColor: "#336699" })), base);
    // A taller building has more rows, a steeper roof too, and a wider one more columns.
    assert.equal(buildingBox({ storeys: 2 }).height, buildingBox({}).height + 2);
    assert.equal(buildingBox({ pitch: "steep" }).height, buildingBox({}).height + 1);
});

test("a roof is seen from above: a ridged roof is lit on the left and in shade on the right, and every roof reaches the top of the picture", () => {
    for (const roof of roofShapes) {
        for (const pitch of roofPitches) {
            const config = { roof, pitch, roofColor: "red" };
            const raster = buildBuilding(config);
            const rows = buildingBox(config).roofTiles * TILE_SIZE;
            // The roof reaches the top of the picture, so it is not just a front slope the height of the wall.
            assert.ok(raster.px.slice(0, raster.width * 4).some((p) => p !== 0), `${roof} ${pitch}: reaches the top`);
            if (!["gable", "hip", "hipFlat", "mansard", "saltbox"].includes(roof)) continue;
            const count = (from, to, colour) => {
                let n = 0;
                for (let y = 0; y < rows; y += 1) for (let x = from; x < to; x += 1) if (raster.colors[raster.px[y * raster.width + x]] === colour) n += 1;
                return n;
            };
            const half = raster.width / 2;
            // The left slope is lit and the right in shade; in a hip roof the front slope is lit all the way across, so the sides only tip the balance.
            assert.ok(count(0, half, colorRamps.red.base) > count(half, raster.width, colorRamps.red.base), `${roof} ${pitch}: left side is lit`);
            assert.ok(count(half, raster.width, colorRamps.red.shadow) > count(0, half, colorRamps.red.shadow), `${roof} ${pitch}: right side is in shade`);
        }
    }
});

test("each roof looks different, and a gable and a saltbox differ only in where the ridge is", () => {
    const pictures = roofShapes.map((roof) => JSON.stringify(paint(buildBuilding({ roof }))));
    assert.equal(new Set(pictures).size, roofShapes.length);
    // A hip roof has a sloping face where a gable has the wall: the wall rectangle is plain.
    const gable = buildBuilding({ roof: "gable", windows: "none", wall: "brick" });
    const hip = buildBuilding({ roof: "hip", windows: "none", wall: "brick" });
    assert.notDeepEqual(paint(gable), paint(hip));
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
                        // A gable (and a saltbox) has a round window of its own whenever the house has windows, so it is compared with a house that has some.
                        assert.deepEqual(above(facade), above({ ...bare, ...(roof === "gable" || roof === "saltbox" ? { windows: "some" } : {}) }), JSON.stringify(config));
                    }
                }
            }
        }
    }
});

test("a longer building has a roof that goes further up, and the facade stays the same", () => {
    const heights = buildingDepths.map((depth) => buildingBox({ depth }).height);
    assert.deepEqual(heights, [0, 1, 2, 3].map((n) => heights[0] + n));
    for (const roof of roofShapes) {
        const short = buildBuilding({ roof, depth: "short" });
        const long = buildBuilding({ roof, depth: "longest" });
        assert.equal(long.height, short.height + 3 * TILE_SIZE);
        // The rows under the roof (wall, door and windows) are the same picture.
        const facade = (r) => paint(r).slice(-(r.width * 3 * TILE_SIZE));
        assert.deepEqual(facade(long), facade(short));
        // The roof reaches the top of the longer picture.
        assert.ok(long.px.slice(0, long.width * 4).some((p) => p !== 0), roof);
    }
    // Only the roof grows, so the door is still at the foot of the building.
    assert.equal(buildingFootprint({ depth: "long" }).at(-1).indexOf("D"), buildingFootprint({}).at(-1).indexOf("D"));
});

test("rooftop equipment goes on the flat part of a roof, only on the roofs that have one, and never on the wall", () => {
    const flatRoofs = ["flat", "hipFlat", "mansard"];
    for (const roof of roofShapes) {
        const config = { roof, width: 8, depth: "medium" };
        const none = buildBuilding(config);
        const box = buildingBox(config);
        // Everything below the roof (and the shadow under its eave) is the wall and facade.
        const below = (r) => paint(r).slice((box.roofTiles * TILE_SIZE + 8) * r.width);
        for (const rooftop of buildingRooftops.filter((r) => r !== "none")) {
            const placed = buildBuilding({ ...config, rooftop });
            if (flatRoofs.includes(roof)) assert.notDeepEqual(paint(placed), paint(none), `${roof} ${rooftop}`);
            else assert.deepEqual(paint(placed), paint(none), `${roof} ${rooftop}: no flat area`);
            assert.deepEqual(below(placed), below(none), `${roof} ${rooftop}: wall untouched`);
        }
    }
});

test("a flat roof is a floor inside a thick parapet: coping all the way round, thicker at the front, with a floor of square tiles", () => {
    const sloping = buildingBox({ roof: "gable" });
    // It needs a tile more than a gable roof: the floor and the parapet round it.
    assert.equal(buildingBox({ roof: "flat" }).height, sloping.height + 1);
    const raster = buildBuilding({ roof: "flat", roofColor: "orange", wallColor: "white" });
    const at = (x, y) => raster.colors[raster.px[y * raster.width + x]];
    const roof = colorRamps.orange;
    const roofRows = buildingBox({ roof: "flat" }).roofTiles * TILE_SIZE + 4;
    const mid = raster.width / 2;
    // The coping is the roof's own colour, at the back, the front and both sides.
    assert.ok([roof.base, roof.highlight, roof.shadow].includes(at(mid, 4)), "back");
    assert.ok([roof.base, roof.highlight, roof.shadow].includes(at(mid, roofRows - 4)), "front");
    assert.ok([roof.base, roof.highlight, roof.shadow].includes(at(4, roofRows / 2)), "left");
    assert.ok([roof.base, roof.highlight, roof.shadow].includes(at(raster.width - 5, roofRows / 2)), "right");
    // The coping is thicker at the front: the rows from each edge to the dark outline round the floor.
    const rowsToOutline = (from, step) => {
        let n = 0;
        for (let y = from; y > 0 && y < roofRows && at(mid + 5, y) !== roof.outline; y += step) n += 1;
        return n;
    };
    const back = rowsToOutline(2, 1);
    const front = rowsToOutline(roofRows - 1, -1);
    assert.ok(front > back, `the front coping (${front}) is thicker than the back (${back})`);
    // The floor is in two tiles of nearly the same tone, and has no stripes.
    const floorTones = new Set();
    for (let x = 12; x < raster.width - 12; x += 1) floorTones.add(at(x, roofRows - 16));
    assert.ok(floorTones.size >= 2 && floorTones.size <= 4, `floor tones: ${[...floorTones].join(", ")}`);
});

test("a side wing is a lower, one-storey section beside a two-storey main part, which has the door", () => {
    for (const wing of ["left", "right"]) {
        for (const width of buildingWidths) {
            for (const roof of roofShapes) {
                const config = { wing, width, roof, storeys: 1 };
                const box = buildingBox(config);
                const plain = buildingBox({ width, roof, storeys: 2 });
                // The main part is two storeys, so the building is as tall as a two-storey one.
                assert.equal(box.height, plain.height, `${wing} ${width} ${roof}`);
                const footprint = buildingFootprint(config);
                assert.equal(footprint.length, box.height);
                assert.ok(footprint.every((row) => row.length === width));
                // The main part is solid from the top; the lower part only from two rows down.
                const top = footprint[0];
                const low = wing === "left" ? top.indexOf("#") : 0;
                assert.ok(top.includes("."), `${wing} ${width} ${roof}: the lower part leaves its top rows open`);
                assert.equal(footprint.at(-1).includes("."), false, "the bottom row is solid or the door");
                assert.equal([...footprint.join("")].filter((c) => c === "D").length, 1);
                void low;
                // The door is in the main part: on the far side from the lower one.
                const door = footprint.at(-1).indexOf("D");
                assert.ok(wing === "left" ? door >= 2 : door < width - 2, `${wing} ${width} ${roof}: the door is in the main part`);
            }
        }
    }
    // The picture has the lower part's roof beside the main one, and a map lets a walker stand where the lower part's top rows are open.
    const config = { wing: "left", width: 8, roof: "flat" };
    const footprint = buildingFootprint(config);
    const map = defineMap(townTileset, Array(12).fill("gggggggggg"), [], [{ config, x: 1, y: 2 }]);
    assert.equal(queryCell(map, 1, 2).solid, false);
    assert.equal(queryCell(map, 1 + 7, 2).solid, true);
    assert.equal(queryCell(map, 1, 2 + footprint.length - 1).solid, true);
});

test("a side wing is joined to the main part: the ground floor wall is one wall, with no seam across the join", () => {
    for (const [wing, join] of [["left", 3 * TILE_SIZE], ["right", 5 * TILE_SIZE]]) {
        for (const wall of ["clapboard", "brick", "stone", "timber"]) {
            const config = { wing, width: 8, roof: "flat", wall, wallColor: "yellow" };
            const raster = buildBuilding(config);
            const at = (x, y) => raster.colors[raster.px[y * raster.width + x]];
            const outline = [colorRamps.yellow.outline];
            // Down the ground floor wall, on both sides of where the two parts meet, nothing is the outline colour: it is not a dark line.
            // (Between the ground floor windows and the foundation, so a beam or a window frame is not what is measured.)
            let dark = 0;
            for (let y = raster.height - 22; y < raster.height - 6; y += 1) for (const x of [join - 1, join]) if (outline.includes(at(x, y))) dark += 1;
            assert.equal(dark, 0, `${wing} ${wall}: a dark seam of ${dark} pixels`);
        }
    }
});

test("the roof of a side wing is complete at the end where it joins the main part: it reaches the taller part's corner, not cut off", () => {
    const red = Object.values(colorRamps.red);
    for (const wing of ["left", "right"]) {
        for (const roof of roofShapes) {
            const config = { wing, width: 8, roof, roofColor: "red", wall: "clapboard", wallColor: "white" };
            const raster = buildBuilding(config);
            const at = (x, y) => raster.colors[raster.px[y * raster.width + x]];
            // The lower part is three tiles wide, and its roof goes right up to the line that is the taller part's corner.
            const join = wing === "left" ? 3 * TILE_SIZE : 5 * TILE_SIZE;
            const nextToLine = wing === "left" ? join - 3 : join + 2;
            const roofRows = buildingBox({ roof: lowerRoof[roof], wing: "none", storeys: 1 }).roofTiles * TILE_SIZE;
            const lowTop = lowTopOf(roof);
            let reaches = 0;
            for (let y = lowTop; y < lowTop + roofRows; y += 1) if (red.includes(at(nextToLine, y))) reaches += 1;
            assert.ok(reaches >= 6, `${wing} ${roof}: the roof only reaches the corner for ${reaches} rows`);
        }
    }
});

test("where a side wing joins, the taller part's corner is a line straight down beside the lower roof, and the lower roof runs up to it", () => {
    for (const [wing, dark, shade] of [["left", 3 * TILE_SIZE - 1, 3 * TILE_SIZE - 2], ["right", 5 * TILE_SIZE, 5 * TILE_SIZE + 1]]) {
        for (const roof of roofShapes) {
            const config = { wing, width: 8, roof, wall: "clapboard", wallColor: "yellow", roofColor: "purple" };
            const raster = buildBuilding(config);
            const at = (x, y) => raster.colors[raster.px[y * raster.width + x]];
            const lowTop = lowTopOf(roof);
            // The line is unbroken for as many rows as the lower roof has at its side, and one pixel of the wall's shadow tone is beside it.
            let line = 0;
            let beside = 0;
            for (let y = lowTop + 24; y < lowTop + 34; y += 1) {
                if (at(dark, y) === colorRamps.yellow.outline) line += 1;
                if (at(shade, y) === colorRamps.yellow.shadow) beside += 1;
            }
            assert.equal(line, 10, `${wing} ${roof}: the line is broken (${line} of 10 rows)`);
            assert.equal(beside, 10, `${wing} ${roof}: the shadow tone beside it is broken (${beside} of 10 rows)`);
        }
        // It runs straight down: the same column all the way, from the side of the taller roof to the lower roof's eave.
        const flat = buildBuilding({ wing, width: 8, roof: "flat", wall: "clapboard", wallColor: "yellow", roofColor: "grey" });
        const colour = (x, y) => flat.colors[flat.px[y * flat.width + x]];
        for (let y = 2 * TILE_SIZE; y < 2 * TILE_SIZE + 3 * TILE_SIZE; y += 1) assert.equal(colour(dark, y), colorRamps.yellow.outline, `${wing}: the line is straight at row ${y}`);
    }
    // On a flat lower roof there is no parapet between the floor and the corner: no coping stone (the roof's base colour) just beside it.
    const flat = buildBuilding({ wing: "left", width: 8, roof: "flat", wall: "clapboard", wallColor: "yellow", roofColor: "grey" });
    for (const x of [3 * TILE_SIZE - 6, 3 * TILE_SIZE - 5, 3 * TILE_SIZE - 4]) assert.notEqual(flat.colors[flat.px[(2 * TILE_SIZE + 30) * flat.width + x]], colorRamps.grey.base, `no parapet at x=${x}: the floor runs up to the corner`);
});

test("a building with a front wing has the door on the wing, which sticks out in front of the rest", () => {
    for (const roof of roofShapes) {
        for (const width of buildingWidths) {
            const config = { roof, wing: "front", width, doorColor: "teal" };
            const plain = buildBuilding({ roof, width });
            const winged = buildBuilding(config);
            const box = buildingBox(config);
            assert.equal(box.height, buildingBox({ roof, width }).height + 2, `${roof} ${width}`);
            assert.equal(winged.height, plain.height + 2 * TILE_SIZE);

            // The part behind is the same width and the wing narrower and in the middle: below the main part only the wing's columns are solid.
            const footprint = buildingFootprint(config);
            assert.equal(footprint.length, box.height);
            const below = footprint.at(-1);
            assert.equal([...below].filter((c) => c === "D").length, 1);
            const solid = [...below].map((c, i) => (c === "." ? -1 : i)).filter((i) => i >= 0);
            assert.ok(solid.length >= 3 && solid.length < width, `${roof} ${width}: wing is narrower`);
            assert.equal(solid[0] + solid.length - 1, solid.at(-1), "the wing is one block");
            assert.equal(solid[0], width - solid.at(-1) - 1, "the wing is in the middle");
            assert.ok(footprint[0].split("").every((c) => c === "#"));
            assert.ok(footprint[footprint.length - 3].includes("#") && footprint[0].includes("#"));

            // The picture has the door in it once: the teal door is painted on the wing, not on the part behind.
            const teal = winged.colors.indexOf(colorRamps.teal.base);
            assert.ok(teal > 0, `${roof} ${width}: the door is teal`);
            const tealRows = new Set();
            winged.px.forEach((p, i) => p === teal && tealRows.add(Math.floor(i / winged.width)));
            assert.ok(Math.min(...tealRows) >= winged.height - 4 * TILE_SIZE, "the door is at the foot of the building");
        }
    }
});

test("beside a front wing the ground in front of the main part is open, and only the wing has a door", () => {
    const config = { roof: "gable", wing: "front", width: 7 };
    const footprint = buildingFootprint(config);
    const map = defineMap(townTileset, Array(12).fill("gggggggggg"), [], [{ config, x: 2, y: 2 }]);
    const doorX = 2 + footprint.at(-1).indexOf("D");
    const doorY = 2 + footprint.length - 1;
    assert.equal(queryCell(map, doorX, doorY).door, true);
    // Beside the wing, below the main part, a walker can stand.
    assert.equal(queryCell(map, 2, doorY).solid, false);
    assert.equal(queryCell(map, 2 + 6, doorY).solid, false);
    // The main part is solid down to the row above them, and the wing is solid in between.
    assert.equal(queryCell(map, 2, doorY - 2).solid, true);
    assert.equal(queryCell(map, 2 + 2, doorY - 1).solid, true);
    assert.equal([...footprint.join("")].filter((c) => c === "D").length, 1);
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
