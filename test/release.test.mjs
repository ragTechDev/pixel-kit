import assert from "node:assert/strict";
import test from "node:test";
import { resolveVersion, setVersion } from "../scripts/release.mjs";

test("resolveVersion applies a bump keyword or accepts an exact higher version", () => {
    assert.equal(resolveVersion("0.8.0", "minor"), "0.9.0");
    assert.equal(resolveVersion("0.8.0", "patch"), "0.8.1");
    assert.equal(resolveVersion("0.8.3", "major"), "1.0.0");
    assert.equal(resolveVersion("0.8.0", "1.0.0"), "1.0.0");
});

test("resolveVersion refuses anything else", () => {
    for (const bad of [undefined, "", "latest", "0.8.0", "0.7.9", "1.0", "v1.0.0", "1.0.0-beta.1"]) {
        assert.throws(() => resolveVersion("0.8.0", bad), /patch, minor, major/, String(bad));
    }
});

test("setVersion changes only the top-level version", () => {
    const text = '{\n  "name": "x",\n  "version": "0.8.0",\n  "engines": { "node": ">=20" },\n  "peer": { "version": "1.0.0" }\n}\n';
    assert.equal(setVersion(text, "0.9.0"), text.replace('"version": "0.8.0"', '"version": "0.9.0"'));
    assert.throws(() => setVersion('{ "name": "x" }', "1.0.0"), /no "version"/);
});
