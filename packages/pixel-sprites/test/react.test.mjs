import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildBuilding, buildIcon, buildMap, buildObject, buildTent, defineMap, toSvgPaths, townTileset } from "../dist/index.js";
import { Avatar, Building, Icon, PixelImage, Tent, Tile, World, WorldObject } from "../dist/react.js";

test("<Icon> renders the same pixels as buildIcon through <PixelImage>", () => {
    const viaIcon = renderToStaticMarkup(createElement(Icon, { id: "heart", pixelSize: 2 }));
    const viaImage = renderToStaticMarkup(createElement(PixelImage, { raster: buildIcon("heart"), pixelSize: 2 }));
    assert.equal(viaIcon, viaImage);
    assert.ok(viaIcon.startsWith("<svg"));
    assert.equal((viaIcon.match(/<path/g) ?? []).length, toSvgPaths(buildIcon("heart")).length);
});

test("<Icon>, <Avatar> and <Tile> take a title for accessibility", () => {
    assert.match(renderToStaticMarkup(createElement(Icon, { id: "cog", title: "Settings" })), /aria-label="Settings"/);
    assert.match(renderToStaticMarkup(createElement(Avatar, { title: "You" })), /aria-label="You"/);
    assert.match(renderToStaticMarkup(createElement(Tile, { id: "grass", title: "Grass" })), /aria-label="Grass"/);
});

test("<WorldObject> and <World> render the same pixels as buildObject and buildMap", () => {
    const map = defineMap(townTileset, ["gggg", "gwwg", "pppp"], [{ id: "tree", x: 0, y: 0 }]);
    assert.equal(
        renderToStaticMarkup(createElement(WorldObject, { id: "tree", pixelSize: 3 })),
        renderToStaticMarkup(createElement(PixelImage, { raster: buildObject("tree"), pixelSize: 3 }))
    );
    assert.equal(
        renderToStaticMarkup(createElement(World, { map, theme: "autumn", pixelSize: 2 })),
        renderToStaticMarkup(createElement(PixelImage, { raster: buildMap(map, "autumn"), pixelSize: 2 }))
    );
    assert.notEqual(
        renderToStaticMarkup(createElement(World, { map, theme: "winter" })),
        renderToStaticMarkup(createElement(World, { map }))
    );
});

test("<Building> renders the same pixels as buildBuilding through <PixelImage>", () => {
    assert.equal(
        renderToStaticMarkup(createElement(Building, { roof: "gable", roofColor: "blue", pixelSize: 2 })),
        renderToStaticMarkup(createElement(PixelImage, { raster: buildBuilding({ roof: "gable", roofColor: "blue" }), pixelSize: 2 }))
    );
    assert.match(renderToStaticMarkup(createElement(Building, { title: "A house" })), /aria-label="A house"/);
});

test("<Tent> renders the same pixels as buildTent through <PixelImage>", () => {
    assert.equal(
        renderToStaticMarkup(createElement(Tent, { style: "dome", tentSize: 3, color: "blue", pixelSize: 2 })),
        renderToStaticMarkup(createElement(PixelImage, { raster: buildTent({ style: "dome", size: 3, color: "blue" }), pixelSize: 2 }))
    );
});
