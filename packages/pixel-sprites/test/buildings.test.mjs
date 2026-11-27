import assert from "node:assert/strict";
import test from "node:test";
import {
    TILE_SIZE, colorRamps, buildBuilding, buildMap, buildingDepths, buildingWings, buildingRooftops, buildingBox, buildingColors, buildingFootprint, buildingMap, buildingProps, buildingStoreys, buildingWalls, buildingWidths,
    chimneys, objectRamps, defaultBuildingConfig, defineMap, doorPositions, doorStyles, porches, queryCell, randomBuilding, resolveBuildingConfig, roofPitches, roofShapes, roofMaterials,
    townTileset, windowStyles, maxWindows, MAX_WINDOWS
} from "../dist/index.js";

// Pixel values index each raster's own colour list, so compare the colours themselves.
const paint = (r) => [...r.px].map((i) => r.colors[i]);
// The row (in pixels) where the lower part of a side wing starts: the taller part is two storeys, the lower one, with the roof it gets, one.
const lowerRoof = { gable: "gable", hip: "hip", hipFlat: "hip", mansard: "hip", gambrel: "gable", saltbox: "gable", flat: "flat" };
const lowTopOf = (roof, width = 8) => (buildingBox({ roof, width, wing: "left", storeys: 2, wingStoreys: 1 }).height - buildingBox({ roof: lowerRoof[roof], width, storeys: 1 }).height) * TILE_SIZE;

test("every choice draws a building a whole number of tiles wide and tall, standing on the bottom row", () => {
    const lists = { width: buildingWidths, storeys: buildingStoreys, roof: roofShapes, wing: buildingWings, pitch: roofPitches, depth: buildingDepths, roofMaterial: roofMaterials, rooftop: buildingRooftops, wingStoreys: buildingStoreys, wall: buildingWalls, door: doorPositions, doorStyle: doorStyles, windows: [0, 1, 2, 3, 4, 5, 6], windowStyle: windowStyles, porch: porches, chimney: chimneys, props: buildingProps };
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
        { chimney: "left" }, { props: "barrels" }, { props: "planters" }, { porch: "deck" }, { windows: 0 }, { windowStyle: "arched" }, { doorStyle: "arched" }]) {
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
    const gable = buildBuilding({ roof: "gable", windows: 0, wall: "brick" });
    const hip = buildBuilding({ roof: "hip", windows: 0, wall: "brick" });
    assert.notDeepEqual(paint(gable), paint(hip));
});

test("nothing on the facade touches the roof or the shadow under its eave", () => {
    const facade = { door: "left", doorStyle: "arched", windows: 4, windowStyle: "shuttered", porch: "deck", props: "planters" };
    const bare = { door: "right", doorStyle: "plain", windows: 0, windowStyle: "plain", porch: "none", props: "none" };
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
                        assert.deepEqual(above(facade), above({ ...bare, ...(roof === "gable" || roof === "saltbox" ? { windows: 2 } : {}) }), JSON.stringify(config));
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
                const config = { wing, width, roof, storeys: 2, wingStoreys: 1 };
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
    const config = { wing: "left", width: 8, roof: "flat", storeys: 2 };
    const footprint = buildingFootprint(config);
    const map = defineMap(townTileset, Array(12).fill("gggggggggg"), [], [{ config, x: 1, y: 2 }]);
    assert.equal(queryCell(map, 1, 2).solid, false);
    assert.equal(queryCell(map, 1 + 7, 2).solid, true);
    assert.equal(queryCell(map, 1, 2 + footprint.length - 1).solid, true);
});

test("a side wing is joined to the main part: the ground floor wall is one wall, and the only dark line across the join is the corner line", () => {
    // The corner line is one dark pixel, with a shadow-tone pixel beside it on the lower part's side. Two columns either side of those, nothing is dark.
    for (const [wing, join, away] of [["left", 3 * TILE_SIZE, [-4, -3, 1, 2]], ["right", 5 * TILE_SIZE, [-3, -2, 3, 4]]]) {
        for (const wall of ["clapboard", "brick", "stone", "timber"]) {
            const config = { wing, width: 8, roof: "flat", storeys: 2, wall, wallColor: "yellow" };
            const raster = buildBuilding(config);
            const at = (x, y) => raster.colors[raster.px[y * raster.width + x]];
            // Between the ground floor windows and the foundation, so a beam or a window frame is not what is measured.
            let dark = 0;
            for (let y = raster.height - 22; y < raster.height - 6; y += 1) for (const dx of away) if (at(join + dx, y) === colorRamps.yellow.outline) dark += 1;
            assert.equal(dark, 0, `${wing} ${wall}: a dark seam of ${dark} pixels beside the corner line`);
        }
    }
});

test("the roof of a side wing is complete at the end where it joins the main part: it reaches the taller part's corner, not cut off", () => {
    const red = Object.values(colorRamps.red);
    for (const wing of ["left", "right"]) {
        for (const roof of roofShapes) {
            const config = { wing, width: 8, roof, storeys: 2, roofColor: "red", wall: "clapboard", wallColor: "white" };
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

test("where a side wing joins, the taller part's corner is a line straight down the wall, right under the lower roof, which goes a pixel past it", () => {
    for (const [wing, dark, shade] of [["left", 3 * TILE_SIZE - 1, 3 * TILE_SIZE - 2], ["right", 5 * TILE_SIZE, 5 * TILE_SIZE + 1]]) {
        for (const roof of roofShapes) {
            const config = { wing, width: 8, roof, storeys: 2, wall: "clapboard", wallColor: "yellow", roofColor: "purple" };
            const raster = buildBuilding(config);
            const at = (x, y) => raster.colors[raster.px[y * raster.width + x]];
            const lowTop = lowTopOf(roof);
            // Where the lower roof's lower edge is, in the picture.
            const eave = lowTop + buildingBox({ roof: lowerRoof[roof], wing: "none", storeys: 1 }).roofTiles * TILE_SIZE + 4;
            // Under the roof the line is unbroken, with one pixel of the wall's shadow tone beside it.
            let line = 0;
            let beside = 0;
            for (let y = eave + 4; y < eave + 24; y += 1) {
                if (at(dark, y) === colorRamps.yellow.outline) line += 1;
                if (at(shade, y) === colorRamps.yellow.shadow) beside += 1;
            }
            assert.equal(line, 20, `${wing} ${roof}: the line is broken (${line} of 20 rows)`);
            assert.equal(beside, 20, `${wing} ${roof}: the shadow tone beside it is broken (${beside} of 20 rows)`);
            // It stops at the foundation, and starts under the roof: above the eave, beside the roof, there is no line.
            for (let y = lowTop + 8; y < eave - 6; y += 1) assert.notEqual(at(dark, y), colorRamps.yellow.outline, `${wing} ${roof}: the line goes up the side of the roof at row ${y}`);
        }
    }
    // On a flat lower roof there is no parapet between the floor and the corner: no coping stone (the roof's base colour) just beside it, and
    // the roof goes a pixel past the line: at the line's own column, beside the roof, it is the roof (not the wall's line colours).
    const flat = buildBuilding({ wing: "left", width: 8, roof: "flat", storeys: 2, wall: "clapboard", wallColor: "yellow", roofColor: "grey" });
    const at = (x, y) => flat.colors[flat.px[y * flat.width + x]];
    for (const x of [3 * TILE_SIZE - 6, 3 * TILE_SIZE - 5, 3 * TILE_SIZE - 4]) assert.notEqual(at(x, 2 * TILE_SIZE + 30), colorRamps.grey.base, `no parapet at x=${x}: the floor runs up to the corner`);
    for (let y = 2 * TILE_SIZE + 12; y < 2 * TILE_SIZE + 30; y += 1) assert.ok(![colorRamps.yellow.outline, colorRamps.yellow.shadow].includes(at(3 * TILE_SIZE - 1, y)), `the flat roof goes past the line at row ${y}`);
});

test("a roof garden is raised planter beds with plants in them, with the floor showing between: not a painted field", () => {
    const raster = buildBuilding({ roof: "flat", rooftop: "garden", width: 8, depth: "medium", roofColor: "grey", wall: "clapboard", wallColor: "white" });
    const count = (colour) => {
        const index = raster.colors.indexOf(colour);
        return index < 0 ? 0 : raster.px.filter((p) => p === index).length;
    };
    // Wooden beds, soil, leaves, and flowers in three colours.
    assert.ok(count(objectRamps.wood.base) > 100, "wooden beds");
    assert.ok(count("#47301F") > 100, "soil");
    assert.ok(count(objectRamps.leaf.base) > 20, "shrubs");
    for (const flower of [objectRamps.flower_red.base, objectRamps.flower_yellow.base, objectRamps.flower_pink.base]) assert.ok(count(flower) > 8, `flowers ${flower}`);
    // The roof's floor still shows between and around the beds: the garden is not a solid green field.
    const roofRows = buildingBox({ roof: "flat", width: 8, depth: "medium" }).roofTiles * TILE_SIZE;
    let green = 0;
    for (let y = 0; y < roofRows; y += 1) for (let x = 0; x < raster.width; x += 1) if (raster.colors[raster.px[y * raster.width + x]] === objectRamps.leaf.base) green += 1;
    assert.ok(green < roofRows * raster.width * 0.08, "the garden is not a field of green");
});

test("a chimney is not on anything else on the roof: rooftop equipment keeps clear of it", () => {
    // The colours of the equipment (air conditioners and vents, skylights, solar panels, boxes), none of which may be in the chimney's footprint.
    const equipment = new Set(["#C3C8CE", "#E8EBEE", "#2E4A7C", "#5B7FB8", "#213A63", "#9CC7DB", "#D6EBF5", "#C79A6B", "#E8EBEE"]);
    for (const roof of ["flat", "hipFlat", "mansard"]) {
        for (const rooftop of buildingRooftops.filter((r) => r !== "none")) {
            for (const chimney of ["left", "right"]) {
                for (const width of buildingWidths) {
                    for (const depth of ["short", "medium", "long"]) {
                        const config = { roof, rooftop, chimney, width, depth, roofColor: "purple", wall: "clapboard", wallColor: "white" };
                        const raster = buildBuilding(config);
                        const cx = Math.round(width * TILE_SIZE * (chimney === "left" ? 0.26 : 0.74));
                        // The stack and its cap: 13 wide, from the row the cap starts on to the foot of the stack.
                        for (let y = 6; y < 28; y += 1) {
                            for (let x = cx - 6; x < cx + 7; x += 1) {
                                const colour = raster.colors[raster.px[y * raster.width + x]];
                                assert.ok(!equipment.has(colour.toUpperCase()), `${roof} ${rooftop} ${chimney} ${width} ${depth}: ${colour} at (${x}, ${y}) is on the chimney`);
                            }
                        }
                    }
                }
            }
        }
    }
});

test("a chimney is not hidden under the roof of a front wing: it stands where the roof behind shows", () => {
    // The brick of the chimney is a colour nothing else in the picture is: count it with and without the wing.
    const bricks = (config) => {
        const raster = buildBuilding(config);
        const brick = raster.colors.indexOf(objectRamps.flower_rust.base);
        return brick < 0 ? 0 : raster.px.filter((p) => p === brick).length;
    };
    for (const roof of ["gable", "hip", "hipFlat", "mansard", "gambrel", "saltbox", "flat"]) {
        for (const chimney of ["left", "right"]) {
            for (const width of buildingWidths) {
                const config = { roof, chimney, width, roofColor: "blue", wall: "clapboard", wallColor: "white", doorColor: "teal" };
                const alone = bricks(config);
                assert.ok(alone > 40, `${roof} ${chimney} ${width}: the chimney is drawn`);
                assert.equal(bricks({ ...config, wing: "front" }), alone, `${roof} ${chimney} ${width}: the wing hides some of the chimney`);
            }
        }
    }
});

test("a wing has its own storeys: the main part has `storeys`, the wing `wingStoreys`, and the door is on the main part (or the front wing)", () => {
    const height = (config) => buildingBox(config).height;
    for (const wing of ["left", "right"]) {
        for (const [storeys, wingStoreys] of [[1, 1], [1, 2], [2, 1], [2, 2]]) {
            const config = { wing, width: 8, roof: "flat", storeys, wingStoreys };
            // The building is as tall as its taller part.
            assert.equal(height(config), Math.max(height({ width: 5, roof: "flat", storeys }), height({ width: 3, roof: "flat", storeys: wingStoreys })), `${wing} ${storeys}/${wingStoreys}`);
            const footprint = buildingFootprint(config);
            assert.equal([...footprint.join("")].filter((c) => c === "D").length, 1);
            // The door is in the main part: on the far side from the wing.
            const door = footprint.at(-1).indexOf("D");
            assert.ok(wing === "left" ? door >= 3 : door < 5, `${wing} ${storeys}/${wingStoreys}: the door is in the main part`);
            // A part that is lower than the other leaves the rows above it open.
            const lowerWidth = wing === "left" ? footprint[0].slice(0, 3) : footprint[0].slice(5);
            if (storeys === wingStoreys) assert.ok(footprint.every((row) => !row.includes(".")), "equal parts fill the picture");
            else assert.equal(lowerWidth.includes("."), wingStoreys < storeys, `${wing} ${storeys}/${wingStoreys}: the lower part leaves its top rows open`);
        }
    }
    // The picture shows each part's storeys: a taller wing has more windows in its column than a lower one.
    const windowRows = (raster, x) => {
        let rows = 0;
        let was = false;
        for (let y = 0; y < raster.height; y += 1) {
            const glass = raster.colors[raster.px[y * raster.width + x]] === objectRamps.glass.base;
            if (glass && !was) rows += 1;
            was = glass;
        }
        return rows;
    };
    const wingTall = buildBuilding({ wing: "left", width: 8, roof: "gable", storeys: 1, wingStoreys: 2 });
    const wingLow = buildBuilding({ wing: "left", width: 8, roof: "gable", storeys: 1, wingStoreys: 1 });
    // Down a column of the wing's windows (the wing is the left three tiles, with two windows, the first one's glass left of the glazing bar): more panes when it has two storeys.
    assert.ok(windowRows(wingTall, 12) > windowRows(wingLow, 12));
    // A front wing has its storeys too: a taller wing makes the picture taller when it is taller than the part behind plus what it sticks out.
    assert.equal(height({ wing: "front", width: 8, roof: "flat", storeys: 1, wingStoreys: 1 }), height({ width: 8, roof: "flat", storeys: 1 }) + 2);
    assert.ok(height({ wing: "front", width: 8, roof: "flat", storeys: 1, wingStoreys: 2 }) > height({ wing: "front", width: 8, roof: "flat", storeys: 1, wingStoreys: 1 }));
    assert.equal(height({ wing: "front", width: 8, roof: "flat", storeys: 2, wingStoreys: 1 }), height({ width: 8, roof: "flat", storeys: 2 }) + 2);
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
    const resolved = resolveBuildingConfig({ width: 99, storeys: "2", roof: "toString", pitch: "__proto__", wall: "glass", door: "up", windows: "many", porch: null, roofColor: "javascript:1", wallColor: "#ABC", trimColor: "nope", doorColor: 5 });
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

test("a roof covering and a wall take their natural colour unless one is given", () => {
    assert.equal(defaultBuildingConfig.roofColor, "natural");
    assert.equal(defaultBuildingConfig.wallColor, "natural");
    assert.equal(resolveBuildingConfig({ roofColor: "natural", wallColor: "natural" }).roofColor, "natural");
    // "natural" is only for the roof and the walls.
    assert.equal(resolveBuildingConfig({ trimColor: "natural", doorColor: "natural" }).trimColor, defaultBuildingConfig.trimColor);
    assert.equal(resolveBuildingConfig({ roofMaterial: "slate" }).roofMaterial, defaultBuildingConfig.roofMaterial);

    const colorsOf = (config) => new Set(paint(buildBuilding(config)));
    // Each covering is its own picture, in its own colour: slate, terracotta, straw, wood.
    const pictures = roofMaterials.map((roofMaterial) => paint(buildBuilding({ roofMaterial }))).map((p) => p.join());
    assert.equal(new Set(pictures).size, roofMaterials.length);
    const base = { shingle: "#5F6670", ceramic: "#C8622F", thatch: "#C9A85C", wood: "#8A6240" };
    for (const roofMaterial of roofMaterials) assert.ok(colorsOf({ roofMaterial }).has(base[roofMaterial]), roofMaterial);
    // A colour replaces the natural one, and the covering's pattern stays.
    assert.ok(!colorsOf({ roofMaterial: "ceramic", roofColor: "blue" }).has("#C8622F"));
    assert.ok(colorsOf({ roofMaterial: "ceramic", roofColor: "blue" }).has(colorRamps.blue.base));
    assert.notDeepEqual(paint(buildBuilding({ roofMaterial: "thatch", roofColor: "blue" })), paint(buildBuilding({ roofMaterial: "wood", roofColor: "blue" })));
    // Each wall material has its own natural colour (brick is red, stone grey), and a colour replaces it.
    assert.ok(colorsOf({ wall: "brick" }).has("#A64B3A"));
    assert.ok(colorsOf({ wall: "timber" }).has("#EDE3CC"));
    assert.ok(!colorsOf({ wall: "brick", wallColor: "yellow" }).has("#A64B3A"));
    assert.ok(colorsOf({ wall: "brick", wallColor: "yellow" }).has(colorRamps.yellow.base));
    // A flat roof has no covering to choose.
    assert.deepEqual(paint(buildBuilding({ roof: "flat", roofMaterial: "thatch" })), paint(buildBuilding({ roof: "flat", roofMaterial: "wood" })));
});

test("windows are a number, spaced evenly, and never more than fit", () => {
    assert.equal(defaultBuildingConfig.windows, 2);
    assert.equal(resolveBuildingConfig({ windows: 3.6 }).windows, 4);
    assert.equal(resolveBuildingConfig({ windows: -2 }).windows, 0);
    assert.equal(resolveBuildingConfig({ windows: 99 }).windows, MAX_WINDOWS);
    assert.equal(resolveBuildingConfig({ windows: "some" }).windows, defaultBuildingConfig.windows);
    const glass = (config) => { const r = buildBuilding(config); return r.px.reduce((n, i) => n + (r.colors[i] === objectRamps.glass.base ? 1 : 0), 0); };
    // Each count up to what fits adds one window, on every storey, door or no door; past that the picture stops changing.
    for (const width of buildingWidths) {
        for (const door of doorPositions) {
            const most = maxWindows(width, "plain", door);
            assert.ok(most >= 2, `a ${width} tile wall fits at least two beside a door`);
            const one = (windows, storeys = 1) => glass({ width, windows, storeys, door, roof: "flat" });
            const pane = one(2) - one(1);
            assert.ok(pane > 0);
            for (let n = 1; n <= most; n += 1) {
                assert.equal(one(n), one(1) + (n - 1) * pane, `${width} ${door}: ${n} on one storey`);
                // Two storeys have n windows each: twice the windows of one.
                assert.equal(one(n, 2) - one(0, 2), 2 * (one(n) - one(0)), `${width} ${door}: ${n} on two storeys`);
            }
            assert.equal(one(most + 1), one(most), `${width} ${door}: past the most, no more`);
            assert.equal(one(99), one(most));
        }
    }
    assert.ok(maxWindows(8, "shuttered") < maxWindows(8, "plain"));
    assert.ok(maxWindows(8, "plain", "centre") < maxWindows(8, "plain"));
});
