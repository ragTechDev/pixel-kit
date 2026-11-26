// Runs against the built package (npm test builds first), so no test runner dependency is needed.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    avatarKey,
    backHairStylesFor,
    buildAvatar,
    buildTile,
    clothesPalettes,
    configKey,
    createCache,
    defaultAvatarConfig,
    eyePalettes,
    hairAccessories,
    hairDrapes,
    hairPalettes,
    hairTextures,
    legPoses,
    collars,
    resolveAvatarConfig,
    skinPalettes,
    tileIds,
    walkCycle,
    tilePalettes,
    toSvgPaths
} from "../dist/index.js";

const allPaletteColors = new Set(
    [skinPalettes, hairPalettes, eyePalettes, clothesPalettes].flatMap((t) =>
        Object.values(t).flatMap((r) => Object.values(r))
    )
);

test("configKey ignores key order and undefined values", () => {
    assert.equal(configKey({ b: "2", a: "1", c: undefined }), configKey({ a: "1", b: "2" }));
    assert.notEqual(configKey({ a: "1" }), configKey({ a: "2" }));
});

test("avatarKey normalises defaults", () => {
    assert.equal(avatarKey({}), avatarKey(defaultAvatarConfig));
    assert.notEqual(avatarKey({}), avatarKey({ hairColor: "black" }));
});

test("resolveAvatarConfig replaces unknown values with defaults", () => {
    const resolved = resolveAvatarConfig({ skinTone: "#ff0000", hairColor: "__proto__", eyeColor: "green" });
    assert.equal(resolved.skinTone, defaultAvatarConfig.skinTone);
    assert.equal(resolved.hairColor, defaultAvatarConfig.hairColor);
    assert.equal(resolved.eyeColor, "green");
});

test("createCache builds once per key and evicts least recently used", () => {
    const cache = createCache(2);
    let builds = 0;
    const build = () => ++builds;
    cache.get("a", build);
    cache.get("a", build);
    assert.equal(builds, 1);
    cache.get("b", build);
    cache.get("a", build); // a is now most recent
    cache.get("c", build); // evicts b
    assert.equal(cache.size, 2);
    cache.get("a", build);
    assert.equal(builds, 3);
    cache.get("b", build);
    assert.equal(builds, 4);
});

test("buildAvatar only uses fixed palette colours and keeps colour", () => {
    const raster = buildAvatar({ skinTone: "brown", hairColor: "blonde" });
    assert.ok(raster.colors.slice(1).every((c) => allPaletteColors.has(c)));
    for (const tone of Object.values(skinPalettes.brown)) assert.ok(raster.colors.includes(tone), tone);
    assert.ok(raster.colors.includes(hairPalettes.blonde.base));
    assert.ok(raster.px.some((v) => v !== 0));
});

test("buildAvatar is deterministic and size is stable across poses", () => {
    const a = buildAvatar({ armPose: "down" });
    const b = buildAvatar({ armPose: "down" });
    const c = buildAvatar({ armPose: "forward", legPose: "contactLeft" });
    assert.deepEqual(a.px, b.px);
    assert.deepEqual([a.width, a.height], [c.width, c.height]);
});

test("buildTile resolves the fixed tile palette", () => {
    for (const id of tileIds) {
        const raster = buildTile(id);
        assert.deepEqual([raster.width, raster.height], [16, 16]);
        assert.ok(raster.colors.slice(1).every((c) => Object.values(tilePalettes.summer).includes(c)));
        assert.equal(buildTile(id), raster, "memoised");
    }
});

test("toSvgPaths covers exactly the opaque pixels", () => {
    const raster = buildAvatar({});
    const opaque = raster.px.filter((v) => v !== 0).length;
    const covered = toSvgPaths(raster)
        .flatMap((p) => [...p.d.matchAll(/h(\d+)v1/g)])
        .reduce((sum, m) => sum + Number(m[1]), 0);
    assert.equal(covered, opaque);
});

test("each piece of clothing can have its own colour, following clothesColor when it has none", () => {
    const has = (raster, name) => Object.values(clothesPalettes[name]).some((c) => raster.colors.includes(c));
    const plain = buildAvatar({ clothesColor: "red" });
    assert.ok(has(plain, "red") && !has(plain, "blue"), "every piece follows clothesColor");

    const mixed = buildAvatar({ clothesColor: "red", topColor: "blue", bottomColor: "green", shoeColor: "yellow" });
    for (const name of ["blue", "green", "yellow"]) assert.ok(has(mixed, name), `${name} piece is drawn`);
    assert.ok(!has(mixed, "red"), "nothing is left in the clothes colour once every piece has its own");

    const shoesOnly = buildAvatar({ shoeColor: "red" });
    assert.ok(has(shoesOnly, "red") && has(shoesOnly, "blue"), "only the shoes change");
    const shape = (r) => Array.from(r.px, (p) => (p === 0 ? 0 : 1)).join("");
    assert.equal(shape(shoesOnly), shape(buildAvatar()), "the shape is the same");

    const dress = buildAvatar({ tuck: "onePiece", bottomStyle: "skirt", bottomLength: "knee", topColor: "pink", bottomColor: "green" });
    assert.ok(has(dress, "pink") && !has(dress, "green"), "a one-piece takes the top colour, and the bottom colour has nothing to colour");
});

test("piece colours that match clothesColor, or are unknown, change nothing", () => {
    assert.equal(avatarKey({ clothesColor: "red", topColor: "red" }), avatarKey({ clothesColor: "red" }));
    assert.equal(avatarKey({ topColor: "plaid" }), avatarKey());
    assert.equal(avatarKey({ topColor: "toString" }), avatarKey(), "inherited keys are not colours");
    assert.notEqual(avatarKey({ topColor: "red" }), avatarKey());
    assert.deepEqual(resolveAvatarConfig({ topColor: "red" }).topColor, "red");
    assert.equal("topColor" in resolveAvatarConfig({ topColor: "blue" }), false, "blue is the clothes colour here");
    assert.deepEqual(buildAvatar({ topColor: "blue" }), buildAvatar(), "the default avatar's pixels are unchanged");
});

test("a one-piece joins the top and the bottom into one garment with no seam", () => {
    const dress = { tuck: "onePiece", topLength: "hip", bottomStyle: "skirt", bottomLength: "knee", shoeStyle: "none", hairLength: "bald", topColor: "pink", bottomColor: "green", clothesColor: "blue" };
    const apart = { ...dress, tuck: "tucked" };
    for (const headOrientation of ["front", "right", "back"]) {
        const whole = buildAvatar({ ...dress, headOrientation });
        const split = buildAvatar({ ...apart, headOrientation });
        assert.notDeepEqual(whole, split, `${headOrientation}: a one-piece is not a top over a skirt`);
        const colours = (r) => new Set(Array.from(r.px, (p) => r.colors[p]));
        assert.ok(!colours(whole).has(clothesPalettes.green.base), "the bottom colour is not used");
    }
    // The pixels where the top meets the bottom are cloth, not an outline: the one-piece has no darker row across it.
    const r = buildAvatar({ ...dress, headOrientation: "front" });
    const pink = new Set(Object.values(clothesPalettes.pink));
    const rows = Array.from({ length: r.height }, (_, y) => Array.from({ length: r.width }, (_, x) => r.colors[r.px[y * r.width + x]]).filter((c) => pink.has(c)).length);
    assert.ok(rows.filter((n) => n > 0).every((n) => n >= 3), "every row of the garment has cloth across it");
    // It needs a bottom to join, and the tuck of an ordinary top changes nothing about it.
    assert.equal(avatarKey({ tuck: "onePiece", bottomStyle: "none" }), avatarKey({ bottomStyle: "none" }));
    assert.equal(avatarKey({ tuck: "onePiece", topStyle: "none" }), avatarKey({ topStyle: "none" }));
    assert.equal(avatarKey({ ...dress, bottomColor: "red" }), avatarKey(dress), "the bottom colour has nothing to colour");
    assert.equal(avatarKey({ ...dress, topLength: "crop" }), avatarKey({ ...dress, topLength: "regular" }), "a one-piece is as long as it takes to reach the bottom");
    assert.equal(resolveAvatarConfig({ ...dress, fullOutfitStyle: "dress" }).fullOutfitStyle, undefined);
});

test("black is not a clothes colour", () => {
    assert.equal("black" in clothesPalettes, false);
    assert.equal(resolveAvatarConfig({ clothesColor: "black" }).clothesColor, defaultAvatarConfig.clothesColor, "it falls back to the default");
    assert.equal("topColor" in resolveAvatarConfig({ topColor: "black" }), false);
});

test("each head orientation draws its own view", () => {
    const grid = (o, extra = {}) => {
        const r = buildAvatar({ headOrientation: o, backHairStyle: "looseBlunt", hairLength: "ear", ...extra });
        return { r, g: Array.from(r.px, (ci) => (ci ? r.colors[ci] : ".")).join(",") };
    };
    const views = ["front", "left", "right", "back"].map((o) => grid(o).g);
    assert.equal(new Set(views).size, 4);
});

test("facing left is facing right flipped", () => {
    const silhouette = (o) => {
        const { width, height, px } = buildAvatar({ headOrientation: o, backHairStyle: "looseBlunt", hairLength: "ear" });
        return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => (px[y * width + x] ? 1 : 0)));
    };
    assert.deepEqual(silhouette("left"), silhouette("right").map((row) => row.reverse()));
});

test("hairLength falls back to shoulder length and each length draws different loose hair", () => {
    assert.equal(resolveAvatarConfig({ hairLength: "nope" }).hairLength, "shoulder");
    assert.equal(defaultAvatarConfig.hairLength, "shoulder");
    const lengths = ["ear", "chin", "shoulder", "armpit", "midBack"];
    for (const headOrientation of ["front", "left", "right", "back"]) {
        // From behind, hair over the shoulders is in front of the body and mostly hidden, so use hair down the back.
        const hairDrape = headOrientation === "back" ? "behindShoulder" : "overShoulder";
        const pictures = lengths.map((hairLength) => {
            const r = buildAvatar({ headOrientation, backHairStyle: "looseBlunt", hairLength, hairDrape });
            return Array.from(r.px, (ci) => (ci ? r.colors[ci] : ".")).join(",");
        });
        assert.equal(new Set(pictures).size, 5, headOrientation);
    }
});

test("a longer hair length makes a longer ponytail", () => {
    const pixels = (hairLength) => buildAvatar({ backHairStyle: "lowPonytailRight", hairLength }).px.filter(Boolean).length;
    // Ear length is a palm tuft rather than a short tail, so the tails start at chin length.
    const sizes = ["chin", "shoulder", "armpit", "midBack"].map(pixels);
    assert.deepEqual(sizes, [...sizes].sort((a, b) => a - b));
});

test("ear length hair can only be loose", () => {
    for (const backHairStyle of ["highPonytailRight", "lowPonytailLeft", "highPonytailMiddle", "highPigtails", "lowPigtails"]) {
        assert.equal(resolveAvatarConfig({ hairLength: "ear", backHairStyle }).backHairStyle, "looseBlunt");
        assert.equal(resolveAvatarConfig({ hairLength: "chin", backHairStyle }).backHairStyle, backHairStyle);
    }
    assert.deepEqual(backHairStylesFor("ear"), ["looseBlunt"]);
    assert.equal(backHairStylesFor("chin").length, 9);
    assert.equal(avatarKey({ hairLength: "ear", backHairStyle: "lowPigtails" }), avatarKey({ hairLength: "ear", backHairStyle: "looseBlunt" }));
});

test("the head has no outline where loose hair frames it", () => {
    const outline = skinPalettes[defaultAvatarConfig.skinTone].outline;
    const outlinePixels = (backHairStyle) => {
        const r = buildAvatar({ backHairStyle, hairLength: "shoulder" });
        const i = r.colors.indexOf(outline);
        return r.px.filter((ci) => ci === i).length;
    };
    assert.ok(outlinePixels("looseBlunt") < outlinePixels("lowPonytailRight"));
});

test("bald draws no hair at all", () => {
    const hairColours = new Set(Object.values(hairPalettes[defaultAvatarConfig.hairColor]));
    const colours = (config) => buildAvatar({ hairColor: defaultAvatarConfig.hairColor, ...config }).colors;
    assert.ok(colours({ hairLength: "shoulder" }).some((c) => hairColours.has(c)));
    for (const headOrientation of ["front", "left", "right", "back"]) {
        assert.ok(!colours({ headOrientation, hairLength: "bald" }).some((c) => hairColours.has(c)), headOrientation);
    }
    assert.deepEqual(backHairStylesFor("bald"), ["looseBlunt"]);
    assert.equal(avatarKey({ hairLength: "bald", backHairStyle: "lowPigtails" }), avatarKey({ hairLength: "bald", backHairStyle: "looseBlunt" }));
});

test("hair texture defaults to straight and each texture draws different hair", () => {
    assert.equal(defaultAvatarConfig.hairTexture, "straight");
    assert.equal(resolveAvatarConfig({ hairTexture: "frizzy" }).hairTexture, "straight");
    assert.deepEqual(Object.keys(hairTextures), ["straight", "wavy", "curly", "coiled"]);
    assert.equal(avatarKey({}), avatarKey({ hairTexture: "straight" }));
    const count = (hairTexture) => buildAvatar({ backHairStyle: "looseBlunt", hairLength: "shoulder", hairTexture }).px.filter(Boolean).length;
    const sizes = Object.keys(hairTextures).map(count);
    assert.equal(new Set(sizes).size, sizes.length);
    assert.ok(count("coiled") > count("straight"));
});

test("a bald head is the same in every texture", () => {
    const grid = (hairTexture) => Array.from(buildAvatar({ hairLength: "bald", hairTexture }).px).join(",");
    assert.equal(new Set(Object.keys(hairTextures).map(grid)).size, 1);
});

test("hair can fall over the shoulders, hang behind them, or have some of each", () => {
    assert.equal(defaultAvatarConfig.hairDrape, "overShoulder");
    assert.deepEqual(Object.keys(hairDrapes), ["overShoulder", "behindShoulder", "overAndBehindShoulder"]);
    assert.equal(resolveAvatarConfig({ hairDrape: "nope" }).hairDrape, "overShoulder");
    const grid = (config) => {
        const r = buildAvatar(config);
        return Array.from(r.px, (ci) => (ci ? r.colors[ci] : ".")).join(",");
    };
    for (const backHairStyle of ["looseBlunt", "lowPigtails"]) {
        // In profile a tail hangs behind the head and never reaches the body, so only loose hair differs.
        for (const headOrientation of backHairStyle === "looseBlunt" ? ["front", "right", "back"] : ["front", "back"]) {
            const base = { backHairStyle, hairLength: "armpit", headOrientation };
            assert.notEqual(grid({ ...base, hairDrape: "overShoulder" }), grid({ ...base, hairDrape: "behindShoulder" }), `${backHairStyle} ${headOrientation}`);
        }
    }
    // Some of each is a strand over the shoulder with the rest behind. From behind the strand is hidden by the body.
    for (const headOrientation of ["front", "right"]) {
        const base = { backHairStyle: "looseBlunt", hairLength: "armpit", headOrientation };
        const some = grid({ ...base, hairDrape: "overAndBehindShoulder" });
        assert.notEqual(some, grid({ ...base, hairDrape: "overShoulder" }), `${headOrientation} some vs over`);
        assert.notEqual(some, grid({ ...base, hairDrape: "behindShoulder" }), `${headOrientation} some vs behind`);
    }
});

test("a tail has no hair left to hang behind, so some of each is over the shoulder", () => {
    for (const backHairStyle of ["highPonytailRight", "lowPigtails"]) {
        const some = { backHairStyle, hairLength: "armpit", hairDrape: "overAndBehindShoulder" };
        assert.equal(avatarKey(some), avatarKey({ ...some, hairDrape: "overShoulder" }), backHairStyle);
    }
    assert.notEqual(avatarKey({ hairLength: "armpit", backHairStyle: "looseBlunt", hairDrape: "overAndBehindShoulder" }), avatarKey({ hairLength: "armpit", backHairStyle: "looseBlunt" }));
});

test("hair above the shoulders has no drape to choose", () => {
    for (const hairLength of ["bald", "ear", "chin"]) {
        assert.equal(avatarKey({ hairLength, hairDrape: "behindShoulder" }), avatarKey({ hairLength, hairDrape: "overShoulder" }), hairLength);
    }
    assert.notEqual(avatarKey({ hairLength: "shoulder", hairDrape: "behindShoulder" }), avatarKey({ hairLength: "shoulder" }));
});

test("loose hair can be cut blunt, in a V or in a U", () => {
    const grid = (config) => {
        const r = buildAvatar(config);
        return Array.from(r.px, (ci) => (ci ? r.colors[ci] : ".")).join(",");
    };
    for (const hairLength of ["shoulder", "armpit", "midBack"]) {
        for (const headOrientation of ["right", "back"]) {
            const base = { hairLength, hairDrape: "behindShoulder", headOrientation };
            const cuts = ["looseBlunt", "looseV", "looseU"].map((backHairStyle) => grid({ ...base, backHairStyle }));
            assert.equal(new Set(cuts).size, 3, `${hairLength} ${headOrientation}`);
        }
    }
    // The cuts need hair that hangs below the head.
    for (const hairLength of ["bald", "ear", "chin"]) {
        for (const backHairStyle of ["looseV", "looseU"]) {
            assert.equal(resolveAvatarConfig({ hairLength, backHairStyle }).backHairStyle, "looseBlunt", `${hairLength} ${backHairStyle}`);
        }
    }
    assert.deepEqual(backHairStylesFor("shoulder").filter((id) => id.startsWith("loose")), ["looseBlunt", "looseV", "looseU"]);
    assert.ok(!backHairStylesFor("chin").includes("looseV"));
});

test("a ponytail can be on the right, on the left or in the middle", () => {
    const grid = (config) => {
        const r = buildAvatar(config);
        return Array.from(r.px, (ci) => (ci ? r.colors[ci] : ".")).join(",");
    };
    assert.equal(defaultAvatarConfig.backHairStyle, "lowPonytailRight");
    for (const height of ["high", "low"]) {
        for (const headOrientation of ["front", "back"]) {
            const pictures = ["Right", "Left", "Middle"].map((side) =>
                grid({ headOrientation, hairLength: "armpit", backHairStyle: `${height}Ponytail${side}` })
            );
            assert.equal(new Set(pictures).size, 3, `${height} ${headOrientation}`);
        }
    }
    // The left ponytail is the right one flipped, so from the front it sits on the other side.
    const silhouette = (backHairStyle, headOrientation) => {
        const { width, height, px } = buildAvatar({ headOrientation, hairLength: "armpit", backHairStyle });
        return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => (px[y * width + x] ? 1 : 0)));
    };
    assert.deepEqual(silhouette("highPonytailLeft", "front"), silhouette("highPonytailRight", "front").map((row) => row.reverse()));
    // A middle tail hangs behind the head, so it has no shoulder to fall over.
    assert.equal(avatarKey({ backHairStyle: "lowPonytailMiddle", hairLength: "armpit", hairDrape: "behindShoulder" }), avatarKey({ backHairStyle: "lowPonytailMiddle", hairLength: "armpit" }));
});

test("a ponytail or pigtails can have a hairtie, a scrunchie or a bow in a colour", () => {
    assert.equal(defaultAvatarConfig.hairAccessory, "none");
    assert.deepEqual(Object.keys(hairAccessories), ["none", "hairtie", "scrunchie", "bow"]);
    assert.equal(resolveAvatarConfig({ backHairStyle: "lowPigtails", hairAccessory: "feather" }).hairAccessory, "none");
    const red = Object.values(clothesPalettes.red);
    const reds = (config) => {
        const r = buildAvatar({ clothesColor: "blue", topStyle: "none", bottomStyle: "none", shoeStyle: "none", ...config });
        return r.px.filter((ci) => ci && red.includes(r.colors[ci])).length;
    };
    for (const backHairStyle of ["highPonytailRight", "lowPonytailLeft", "highPonytailMiddle", "lowPigtails"]) {
        for (const headOrientation of ["front", "back", "right"]) {
            const base = { backHairStyle, hairLength: "armpit", headOrientation, hairAccessoryColor: "red" };
            assert.equal(reds({ ...base, hairAccessory: "none" }), 0, `${backHairStyle} ${headOrientation} none`);
            // From behind a high ponytail falls over its tie, so a hairtie can be hidden there; the wider ones still peek out.
            const hidden = headOrientation === "back" && backHairStyle.startsWith("high") && backHairStyle.includes("Ponytail");
            for (const hairAccessory of hidden ? ["scrunchie", "bow"] : ["hairtie", "scrunchie", "bow"]) {
                assert.ok(reds({ ...base, hairAccessory }) > 0, `${backHairStyle} ${headOrientation} ${hairAccessory}`);
            }
            if (hidden) assert.ok(reds({ ...base, hairAccessory: "hairtie" }) < reds({ ...base, hairAccessory: "scrunchie" }), `${backHairStyle} hairtie is mostly hidden`);
        }
    }
    assert.ok(reds({ hairLength: "armpit", backHairStyle: "lowPigtails", hairAccessory: "bow", hairAccessoryColor: "red" }) > reds({ hairLength: "armpit", backHairStyle: "lowPigtails", hairAccessory: "hairtie", hairAccessoryColor: "red" }));
});

test("only tied hair has an accessory, and with none its colour does not count", () => {
    for (const config of [{ backHairStyle: "looseBlunt", hairLength: "armpit" }, { backHairStyle: "lowPigtails", hairLength: "ear" }, { backHairStyle: "lowPigtails", hairLength: "bald" }]) {
        assert.equal(resolveAvatarConfig({ ...config, hairAccessory: "bow" }).hairAccessory, "none", JSON.stringify(config));
        assert.equal(avatarKey({ ...config, hairAccessory: "bow", hairAccessoryColor: "red" }), avatarKey(config));
    }
    const tied = { backHairStyle: "lowPigtails", hairLength: "armpit" };
    assert.equal(avatarKey({ ...tied, hairAccessory: "none", hairAccessoryColor: "red" }), avatarKey(tied));
    assert.notEqual(avatarKey({ ...tied, hairAccessory: "bow", hairAccessoryColor: "red" }), avatarKey({ ...tied, hairAccessory: "bow" }));
    // The accessory follows the clothes colour until it has a colour of its own.
    assert.equal(avatarKey({ ...tied, hairAccessory: "bow", hairAccessoryColor: "blue" }), avatarKey({ ...tied, hairAccessory: "bow", clothesColor: "blue" }));
});

test("walk cycle: every pose, view and shoe keeps the avatar's size in its view, and each right-foot frame is the left one flipped", () => {
    const size = (r) => [r.width, r.height];
    for (const shoeStyle of ["boots", "sandals", "shoes"]) {
        for (const legPose of Object.keys(legPoses)) {
            for (const headOrientation of ["front", "back", "left", "right"]) {
                assert.deepEqual(size(buildAvatar({ shoeStyle, legPose, headOrientation })), size(buildAvatar({ shoeStyle, headOrientation })), `${shoeStyle} ${legPose} ${headOrientation}`);
            }
        }
        // Facing front the legs are symmetric about the middle, so each right-foot row is the left-foot row mirrored about it.
        const stand = buildAvatar({ shoeStyle, hairLength: "bald" });
        const rowSet = (r, y) => new Set([...Array(r.width).keys()].filter((x) => r.px[y * r.width + x]));
        const first = stand.height - 4;
        const axis = Math.min(...rowSet(stand, first)) + Math.max(...rowSet(stand, first));
        const left = buildAvatar({ shoeStyle, hairLength: "bald", legPose: "contactLeft" });
        const right = buildAvatar({ shoeStyle, hairLength: "bald", legPose: "contactRight" });
        for (let y = first; y < stand.height; y += 1) {
            assert.deepEqual([...rowSet(right, y)].sort((m, n) => m - n), [...rowSet(left, y)].map((x) => axis - x).sort((m, n) => m - n), `${shoeStyle} row ${y}`);
        }
    }
});

test("walk cycle: the frames differ from standing and from each other", () => {
    assert.deepEqual(walkCycle, ["contactLeft", "neutral", "contactRight", "neutral"]);
    for (const headOrientation of ["front", "back", "right"]) {
        const frames = ["neutral", "contactLeft", "contactRight"].map((legPose) => [...buildAvatar({ headOrientation, legPose }).px].join());
        // Standing and each step are different in every view. A side view shows the same legs whichever foot leads, but the arm swings the other way.
        assert.equal(new Set(frames).size, 3, headOrientation);
    }
});

test("walk cycle: boots cover the whole shin in every frame, so no skin shows below the knee", () => {
    const skin = new Set(Object.values(skinPalettes.light));
    for (const headOrientation of ["front", "back", "left", "right"]) {
        for (const legPose of Object.keys(legPoses)) {
            const r = buildAvatar({ headOrientation, legPose, shoeStyle: "boots", skinTone: "light", hairLength: "bald" });
            for (let y = r.height - 3; y < r.height; y += 1) {
                for (let x = 0; x < r.width; x += 1) assert.ok(!skin.has(r.colors[r.px[y * r.width + x]]), `${headOrientation} ${legPose} row ${y} column ${x}`);
            }
        }
    }
});

test("walk cycle: from the front and back the two legs never merge into one", () => {
    // The gap between the legs is outlined, so it is the outline colour where the legs are apart and skin where they have merged.
    const outline = skinPalettes.light.outline;
    for (const headOrientation of ["front", "back"]) {
        const base = { headOrientation, skinTone: "light", shoeStyle: "none", bottomStyle: "pants", hairLength: "bald" };
        const stand = buildAvatar(base);
        const first = stand.height - 4;
        const filled = [...Array(stand.width).keys()].filter((x) => stand.px[first * stand.width + x]);
        const axis = (Math.min(...filled) + Math.max(...filled)) / 2;
        for (const legPose of Object.keys(legPoses)) {
            const r = buildAvatar({ ...base, legPose });
            // Every row of the legs until the second one ends has the outlined gap in the middle.
            for (let y = first; y < first + 3; y += 1) assert.equal(r.colors[r.px[y * r.width + axis]], outline, `${headOrientation} ${legPose} row ${y - first}`);
        }
    }
});

test("in profile the hand of an arm swung forward is over the body", () => {
    const skin = new Set(Object.values(skinPalettes.light));
    const shirt = new Set(Object.values(clothesPalettes.red));
    const look = { headOrientation: "right", skinTone: "light", topStyle: "shirt", clothesColor: "red", hairLength: "bald", shoeStyle: "none", bottomStyle: "none" };
    const standing = buildAvatar(look);
    const swung = buildAvatar({ ...look, legPose: "contactLeft" });
    assert.deepEqual([swung.width, swung.height], [standing.width, standing.height]);
    const colour = (r, x, y) => r.colors[r.px[y * r.width + x]];
    // The torso is the shirt columns on a row with no arm; the hand is the lowest skin that sits among them.
    const row = standing.height - 11;
    const torso = [...Array(standing.width).keys()].filter((x) => shirt.has(colour(standing, x, row)));
    const handRows = [...Array(5).keys()].map((i) => row + 2 + i);
    const over = handRows.some((y) => torso.some((x) => skin.has(colour(swung, x, y)) && shirt.has(colour(standing, x, row))));
    assert.ok(over);
});

test("walk cycle: hair swishes with the steps and the avatar keeps its size", () => {
    const looks = [
        { backHairStyle: "lowPonytailRight", hairLength: "armpit" },
        { backHairStyle: "highPigtails", hairLength: "shoulder" },
        { backHairStyle: "looseBlunt", hairLength: "midBack", hairDrape: "behindShoulder" },
        { backHairStyle: "looseBlunt", hairLength: "chin" },
        { backHairStyle: "lowPonytailRight", hairLength: "chin" },
        { backHairStyle: "highPigtails", hairLength: "chin" }
    ];
    for (const look of looks) {
        for (const headOrientation of ["front", "back", "left", "right"]) {
            const frames = ["neutral", "contactLeft", "contactRight"].map((legPose) => buildAvatar({ ...look, headOrientation, legPose, hairColor: "red", hairAccessory: "none", clothesColor: "blue" }));
            for (const f of frames) assert.deepEqual([f.width, f.height], [frames[0].width, frames[0].height], `${look.backHairStyle} ${headOrientation}`);
            // The hair is the only red here, so where the picture's pixels in the hair's colours are is where the hair is.
            const ramp = new Set(Object.values(hairPalettes.red));
            const where = (f) => [...f.px].map((p, i) => (ramp.has(f.colors[p]) ? i : -1)).filter((i) => i >= 0).join();
            assert.notEqual(where(frames[1]), where(frames[0]), `${look.backHairStyle} ${headOrientation} swings`);
            assert.notEqual(where(frames[1]), where(frames[2]), `${look.backHairStyle} ${headOrientation} swings both ways`);
        }
    }
});

test("walk cycle: from the front and back the hair swings toward the planted foot", () => {
    // Read from the picture alone: the planted foot is the lowest skin, and the hair is the only red.
    const skin = new Set(Object.values(skinPalettes.light));
    const hair = new Set(Object.values(hairPalettes.red));
    const centroid = (r, rows, wanted) => {
        let sum = 0;
        let count = 0;
        for (const y of rows) {
            for (let x = 0; x < r.width; x += 1) {
                if (wanted.has(r.colors[r.px[y * r.width + x]])) {
                    sum += x;
                    count += 1;
                }
            }
        }
        return sum / count;
    };
    const all = (r) => [...Array(r.height).keys()];
    const lowestSkinRow = (r) => Math.max(...all(r).filter((y) => centroid(r, [y], skin) >= 0));
    const looks = [
        { backHairStyle: "looseBlunt", hairLength: "midBack", hairDrape: "behindShoulder" },
        { backHairStyle: "lowPonytailMiddle", hairLength: "armpit" },
        { backHairStyle: "highPigtails", hairLength: "shoulder" },
        { backHairStyle: "looseBlunt", hairLength: "chin" },
        { backHairStyle: "lowPonytailRight", hairLength: "chin" },
        { backHairStyle: "highPigtails", hairLength: "chin" }
    ];
    for (const look of looks) {
        for (const headOrientation of ["front", "back"]) {
            const base = { ...look, headOrientation, hairColor: "red", skinTone: "light", clothesColor: "blue", topStyle: "shirt", bottomStyle: "pants", shoeStyle: "none", hairAccessory: "none" };
            const standing = buildAvatar(base);
            for (const legPose of ["contactLeft", "contactRight"]) {
                const stepping = buildAvatar({ ...base, legPose });
                const planted = Math.sign(centroid(stepping, [lowestSkinRow(stepping)], skin) - centroid(standing, [lowestSkinRow(standing)], skin));
                const swung = Math.sign(centroid(stepping, all(stepping), hair) - centroid(standing, all(standing), hair));
                assert.notEqual(planted, 0, `${headOrientation} ${legPose}: a planted foot`);
                assert.equal(swung, planted, `${look.backHairStyle} ${headOrientation} ${legPose}`);
            }
        }
    }
});

test("walk cycle: an accessory tied at the root of a tuft stays put while the fronds swing", () => {
    // The bow is the only red, so where the picture's red pixels are is where the bow is.
    const bow = new Set(Object.values(clothesPalettes.red));
    const hair = new Set(Object.values(hairPalettes.brown));
    for (const headOrientation of ["front", "back", "left", "right"]) {
        const look = { headOrientation, hairLength: "chin", backHairStyle: "highPonytailMiddle", hairAccessory: "bow", hairAccessoryColor: "red", clothesColor: "blue", hairColor: "brown" };
        const where = (f, colours) => [...f.px].map((p, i) => (colours.has(f.colors[p]) ? i : -1)).filter((i) => i >= 0).join();
        // From behind the bow is under the tuft, so the leaning fronds cover a pixel or two of its edge; its middle stays.
        const middle = (f) => {
            const at = [...f.px].map((p, i) => (bow.has(f.colors[p]) ? [i % f.width, Math.floor(i / f.width)] : null)).filter(Boolean);
            return [at.reduce((s, [x]) => s + x, 0) / at.length, at.reduce((s, [, y]) => s + y, 0) / at.length];
        };
        const frames = ["neutral", "contactLeft", "contactRight"].map((legPose) => buildAvatar({ ...look, legPose }));
        for (const step of [frames[1], frames[2]]) {
            const [x, y] = middle(step);
            const [x0, y0] = middle(frames[0]);
            assert.ok(Math.abs(x - x0) < 0.75 && Math.abs(y - y0) < 0.75, `${headOrientation}: the bow stays`);
        }
        assert.notEqual(where(frames[1], hair), where(frames[0], hair), `${headOrientation}: the tuft swings`);
    }
});

test("a skirt has a shape and a length, and nothing else does", () => {
    const skirt = { bottomStyle: "skirt", topStyle: "shirt" };
    assert.equal(resolveAvatarConfig({ ...skirt, skirtShape: "pleated", bottomLength: "knee" }).skirtShape, "pleated");
    assert.equal(resolveAvatarConfig({ ...skirt, skirtShape: "pencil", bottomLength: "floor" }).bottomLength, "floor");
    // Anything unknown falls back, and what does not apply is dropped so equivalent looks share a key.
    assert.equal(resolveAvatarConfig({ ...skirt, bottomLength: "maxi" }).bottomLength, "short");
    assert.equal(avatarKey({ ...skirt, skirtShape: "pleated", bottomLength: "short" }), avatarKey({ ...skirt }), "a one-row skirt has no shape");
    assert.equal(avatarKey({ bottomStyle: "none", skirtShape: "pencil", bottomLength: "floor" }), avatarKey({ bottomStyle: "none" }), "no bottom has neither");
    // The plain skirt is the one-row skirt, as it always was.
    assert.deepEqual(buildAvatar({ bottomStyle: "skirt" }), buildAvatar({ bottomStyle: "skirt", skirtShape: "flowing", bottomLength: "short" }));
});

test("skirts get longer with the length, in every shape", () => {
    const red = new Set(Object.values(clothesPalettes.red));
    const skirtPixels = (look) => {
        const r = buildAvatar({ bottomStyle: "skirt", bottomColor: "red", clothesColor: "blue", shoeStyle: "none", hairLength: "bald", ...look });
        return [...r.px].filter((p) => red.has(r.colors[p])).length;
    };
    for (const skirtShape of ["flowing", "pleated", "pencil"]) {
        const counts = ["short", "knee", "calf", "ankle", "floor"].map((bottomLength) => skirtPixels({ skirtShape, bottomLength }));
        for (let i = 1; i < counts.length; i += 1) assert.ok(counts[i] > counts[i - 1], `${skirtShape}: longer skirts have more skirt (${counts})`);
    }
});

test("flowing and pleated skirts sway like hair when walking, a pencil skirt does not, and every pose is one size", () => {
    const red = new Set(Object.values(clothesPalettes.red));
    // Only the hem, the skirt's lowest row, is compared, since a swinging hand can cover the rows above it.
    const hem = (f) => {
        const at = [...f.px].map((p, i) => (red.has(f.colors[p]) ? i : -1)).filter((i) => i >= 0);
        const last = Math.floor(at[at.length - 1] / f.width);
        return at.filter((i) => Math.floor(i / f.width) >= last).join();
    };
    const swaying = { flowing: ["knee", "calf", "ankle", "floor"], pleated: ["calf", "ankle", "floor"], pencil: [] };
    for (const headOrientation of ["front", "back", "left", "right"]) {
        for (const skirtShape of ["flowing", "pleated", "pencil"]) {
            for (const bottomLength of ["knee", "calf", "ankle", "floor"]) {
                const frames = ["neutral", "contactLeft", "contactRight"].map((legPose) =>
                    buildAvatar({ headOrientation, legPose, bottomStyle: "skirt", skirtShape, bottomLength, bottomColor: "red", clothesColor: "blue", shoeStyle: "none", hairLength: "bald" })
                );
                const label = `${headOrientation} ${skirtShape} ${bottomLength}`;
                for (const f of frames) assert.deepEqual([f.width, f.height], [frames[0].width, frames[0].height], `${label}: one size in every pose`);
                const moves = hem(frames[1]) !== hem(frames[0]) && hem(frames[2]) !== hem(frames[0]);
                assert.equal(moves, swaying[skirtShape].includes(bottomLength), `${label}: ${moves ? "sways" : "stays"}`);
            }
        }
    }
});

test("an ankle-length skirt shows only the last row of the feet, and a floor-length one hangs over the legs and the tops of the shoes", () => {
    const red = new Set(Object.values(clothesPalettes.red));
    for (const skirtShape of ["flowing", "pleated", "pencil"]) {
        for (const headOrientation of ["front", "back", "left", "right"]) {
            for (const shoeStyle of ["boots", "shoes", "sandals"]) {
                for (const legPose of ["neutral", "contactLeft", "contactRight"]) {
                    const look = { headOrientation, legPose, bottomStyle: "skirt", skirtShape, bottomColor: "red", shoeStyle, shoeColor: "yellow", clothesColor: "blue", topStyle: "shirt", hairLength: "bald" };
                    const ankle = buildAvatar({ ...look, bottomLength: "ankle" });
                    const floor = buildAvatar({ ...look, bottomLength: "floor" });
                    const yellow = new Set([clothesPalettes.yellow.base, clothesPalettes.yellow.shadow, clothesPalettes.yellow.highlight]);
                    const noShoesAbove = (f, row) => {
                        for (let i = 0; i < row * f.width; i += 1) assert.ok(!yellow.has(f.colors[f.px[i]]), `${skirtShape} ${headOrientation} ${shoeStyle} ${legPose}: no shoe above row ${row}`);
                    };
                    // A swinging hand can cover the skirt, so only the shoes are checked. An ankle-length skirt leaves just the last row of
                    // the shoes, above the outline under them, and a floor-length one hangs over the shoes, so a boot shows only where it sticks out past the skirt in profile.
                    noShoesAbove(ankle, ankle.height - 2);
                    noShoesAbove(floor, floor.height - 4);
                }
            }
        }
    }
});

test("a pleated skirt has fold lines in the shadow colour, and a flowing or pencil one has none", () => {
    const ramp = clothesPalettes.red;
    const folds = (look) => {
        const r = buildAvatar({ bottomStyle: "skirt", bottomColor: "red", clothesColor: "blue", shoeStyle: "none", hairLength: "bald", bottomLength: "floor", ...look });
        return [...r.px].filter((p) => r.colors[p] === ramp.shadow).length;
    };
    const flowing = folds({ skirtShape: "flowing" });
    assert.ok(folds({ skirtShape: "pleated" }) > flowing + 4, "pleats add fold lines");
    assert.ok(folds({ skirtShape: "pleated", headOrientation: "right" }) > folds({ skirtShape: "flowing", headOrientation: "right" }), "and so do they in profile");
});

test("pants have a length and no shape, and the shortest pants are what an avatar wears by default", () => {
    assert.equal(resolveAvatarConfig({ bottomStyle: "pants", bottomLength: "ankle" }).bottomLength, "ankle");
    assert.equal(avatarKey({ bottomStyle: "pants", skirtShape: "pencil", bottomLength: "ankle" }), avatarKey({ bottomStyle: "pants", bottomLength: "ankle" }), "pants have no shape");
    // The default look is the shortest pants.
    assert.equal(defaultAvatarConfig.bottomStyle, "pants");
    assert.equal(defaultAvatarConfig.bottomLength, "short");
    for (const headOrientation of ["front", "left", "right", "back"]) {
        for (const legPose of ["neutral", "contactLeft", "contactRight"]) {
            assert.deepEqual(buildAvatar({ headOrientation, legPose, bottomStyle: "pants", bottomLength: "short" }), buildAvatar({ headOrientation, legPose }), `${headOrientation} ${legPose}`);
        }
    }
});

test("pants get longer with the length, and step with the legs", () => {
    const red = new Set(Object.values(clothesPalettes.red));
    const pantsAt = (f) => [...f.px].map((p, i) => (red.has(f.colors[p]) ? i : -1)).filter((i) => i >= 0);
    const look = { bottomStyle: "pants", bottomColor: "red", clothesColor: "blue", shoeStyle: "none", hairLength: "bald" };
    const counts = ["short", "knee", "calf", "ankle", "floor"].map((bottomLength) => pantsAt(buildAvatar({ ...look, bottomLength })).length);
    for (let i = 1; i < counts.length; i += 1) assert.ok(counts[i] > counts[i - 1], `longer pants have more cloth (${counts})`);
    for (const headOrientation of ["front", "back", "left", "right"]) {
        for (const bottomLength of ["calf", "ankle", "floor"]) {
            const frames = ["neutral", "contactLeft", "contactRight"].map((legPose) => buildAvatar({ ...look, headOrientation, bottomLength, legPose }));
            for (const f of frames) assert.deepEqual([f.width, f.height], [frames[0].width, frames[0].height], `${headOrientation} ${bottomLength}: one size in every pose`);
            // Below the hands, the lowest rows of cloth: the legs step, so the pants do.
            const low = (f) => pantsAt(f).filter((i) => Math.floor(i / f.width) >= f.height - 5).join();
            assert.notEqual(low(frames[1]), low(frames[0]), `${headOrientation} ${bottomLength}: the pants step`);
            assert.notEqual(low(frames[2]), low(frames[0]), `${headOrientation} ${bottomLength}: and step the other way`);
        }
    }
});

test("ankle-length pants show only the last row of the feet, and floor-length pants hang over the legs", () => {
    const red = new Set(Object.values(clothesPalettes.red));
    for (const headOrientation of ["front", "back", "left", "right"]) {
        for (const shoeStyle of ["boots", "shoes", "sandals"]) {
            for (const legPose of ["neutral", "contactLeft", "contactRight"]) {
                const look = { headOrientation, legPose, bottomStyle: "pants", bottomColor: "red", shoeStyle, shoeColor: "yellow", clothesColor: "blue", topStyle: "shirt", hairLength: "bald" };
                const yellow = new Set([clothesPalettes.yellow.base, clothesPalettes.yellow.shadow, clothesPalettes.yellow.highlight]);
                const noShoesAbove = (f, row) => {
                    for (let i = 0; i < row * f.width; i += 1) assert.ok(!yellow.has(f.colors[f.px[i]]), `${headOrientation} ${shoeStyle} ${legPose}: no shoe above row ${row}`);
                };
                const ankle = buildAvatar({ ...look, bottomLength: "ankle" });
                const floor = buildAvatar({ ...look, bottomLength: "floor" });
                noShoesAbove(ankle, ankle.height - 2);
                noShoesAbove(floor, floor.height - 4);
            }
        }
    }
});

test("a top has a length, sleeves and a collar", () => {
    assert.equal(defaultAvatarConfig.topStyle, "top");
    assert.deepEqual([defaultAvatarConfig.topLength, defaultAvatarConfig.sleeveLength, defaultAvatarConfig.collar], ["regular", "short", "round"]);
    assert.equal(resolveAvatarConfig({ topStyle: "shirt" }).topStyle, "top", "an unknown top falls back");
    // Anything unknown falls back, and what does not apply is dropped so equivalent looks share a key.
    assert.equal(resolveAvatarConfig({ collar: "ruff" }).collar, "round");
    assert.equal(avatarKey({ topStyle: "none", collar: "cowl" }), avatarKey({ topStyle: "none" }), "no top has none of them");
    for (const collar of ["strapless", "straps", "halter"]) {
        assert.equal(resolveAvatarConfig({ collar, sleeveLength: "long" }).sleeveLength, "none", `${collar} has no sleeves`);
        assert.equal(avatarKey({ collar, sleeveLength: "long" }), avatarKey({ collar }), `${collar}: sleeves do not count`);
    }
    assert.equal(resolveAvatarConfig({ collar: "offShoulder", sleeveLength: "long" }).sleeveLength, "long", "an off-shoulder top can have sleeves");
});

test("collars: each neckline is drawn differently from the front, and every top keeps its size across poses", () => {
    const ids = Object.keys(collars);
    assert.ok(ids.length >= 19, `${ids.length} collars`);
    const seen = new Map();
    for (const collar of ids) {
        const f = buildAvatar({ topStyle: "top", collar, sleeveLength: "none", hairLength: "bald" });
        const key = [...f.px].map((p) => f.colors[p]).join();
        assert.ok(!seen.has(key), `${collar} looks like ${seen.get(key)}`);
        seen.set(key, collar);
    }
    for (const collar of ids) {
        for (const topLength of ["crop", "short", "regular", "long"]) {
            for (const sleeveLength of ["none", "cap", "short", "long"]) {
                for (const headOrientation of ["front", "back", "left", "right"]) {
                    const frames = ["neutral", "contactLeft", "contactRight"].map((legPose) => buildAvatar({ topStyle: "top", collar, topLength, sleeveLength, headOrientation, legPose, hairLength: "bald" }));
                    for (const f of frames) assert.deepEqual([f.width, f.height], [frames[0].width, frames[0].height], `${collar} ${topLength} ${sleeveLength} ${headOrientation}`);
                }
            }
        }
    }
});

test("tops get longer with the length, and sleeves get longer with the sleeve length", () => {
    const red = new Set(Object.values(clothesPalettes.red));
    const cloth = (look) => {
        const r = buildAvatar({ topStyle: "top", topColor: "red", clothesColor: "blue", bottomStyle: "none", shoeStyle: "none", hairLength: "bald", ...look });
        return [...r.px].filter((p) => red.has(r.colors[p])).length;
    };
    for (const collar of ["round", "v", "turtleneck", "strapless", "straps"]) {
        const lengths = ["crop", "short", "regular", "long"].map((topLength) => cloth({ collar, topLength, sleeveLength: "none" }));
        for (let i = 1; i < lengths.length; i += 1) assert.ok(lengths[i] > lengths[i - 1], `${collar}: longer tops have more cloth (${lengths})`);
    }
    for (const collar of ["round", "shirt", "cowl", "offShoulder"]) {
        const sleeves = ["none", "cap", "short", "long"].map((sleeveLength) => cloth({ collar, sleeveLength }));
        for (let i = 1; i < sleeves.length; i += 1) assert.ok(sleeves[i] > sleeves[i - 1], `${collar}: longer sleeves have more cloth (${sleeves})`);
    }
});

test("collar details are drawn in the darkest tone, and a neckline opening shows bare skin", () => {
    const base = { topStyle: "top", sleeveLength: "none", topColor: "red", clothesColor: "blue", bottomStyle: "none", shoeStyle: "none", hairLength: "bald", skinTone: "light" };
    const count = (collar, colour) => {
        const r = buildAvatar({ ...base, collar });
        return [...r.px].filter((p) => r.colors[p] === colour).length;
    };
    const darkest = clothesPalettes.red.outline;
    const plain = count("round", darkest);
    for (const collar of ["shirt", "polo", "henley", "turtleneck", "mock", "cowl"]) assert.ok(count(collar, darkest) > plain, `${collar} has dark marks that a round neck lacks`);
    // An opening has no outline of its own, so the skin under it shows: more skin than a round neck, and no skin-coloured outline.
    const skin = skinPalettes.light.base;
    const bare = count("round", skin);
    for (const collar of ["scoop", "square", "v", "plunge", "boat", "sweetheart", "keyhole"]) assert.ok(count(collar, skin) > bare, `${collar} shows bare skin at the neck`);
});

test("a top that reaches the bottom can hang over it, and no other top has a tuck", () => {
    // Only a hip or tunic top, over a bottom, has a tuck: for anything else it does not change the look or the key.
    for (const topLength of ["crop", "short", "regular", "long"]) assert.equal(avatarKey({ topStyle: "top", topLength, tuck: "tucked" }), avatarKey({ topStyle: "top", topLength }), `${topLength} does not meet the bottom`);
    assert.equal(avatarKey({ topStyle: "top", topLength: "hip", bottomStyle: "none", tuck: "tucked" }), avatarKey({ topStyle: "top", topLength: "hip", bottomStyle: "none" }), "no bottom to hang over");
    // A top that reaches the bottom hangs over it unless it is tucked in.
    assert.equal(defaultAvatarConfig.tuck, "untucked");
    assert.notEqual(avatarKey({ topStyle: "top", topLength: "hip", tuck: "tucked" }), avatarKey({ topStyle: "top", topLength: "hip" }));
    const red = new Set(Object.values(clothesPalettes.red));
    const cloth = (look) => {
        const r = buildAvatar({ topStyle: "top", topColor: "red", bottomColor: "blue", clothesColor: "blue", shoeStyle: "none", hairLength: "bald", sleeveLength: "none", ...look });
        return [...r.px].filter((p) => red.has(r.colors[p])).length;
    };
    for (const bottom of [{ bottomStyle: "pants", bottomLength: "ankle" }, { bottomStyle: "skirt", skirtShape: "pencil", bottomLength: "calf" }]) {
        for (const topLength of ["hip", "tunic"]) {
            for (const headOrientation of ["front", "back", "left", "right"]) {
                const look = { topLength, headOrientation, ...bottom };
                // Over the bottom the top shows more of itself, and it is the same picture size either way.
                assert.ok(cloth({ ...look, tuck: "untucked" }) > cloth({ ...look, tuck: "tucked" }), `${topLength} over ${bottom.bottomStyle} ${headOrientation}`);
                const a = buildAvatar({ topStyle: "top", ...look, tuck: "untucked" });
                const b = buildAvatar({ topStyle: "top", ...look, tuck: "tucked" });
                assert.deepEqual([a.width, a.height], [b.width, b.height]);
            }
        }
    }
    // A longer top has more cloth: the tunic reaches past the hips.
    assert.ok(cloth({ topLength: "tunic" }) > cloth({ topLength: "hip" }) && cloth({ topLength: "hip" }) > cloth({ topLength: "long" }));
});
