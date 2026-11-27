import { defineMap, type TileMap } from "./map";
import { buildingBox } from "./buildings/draw";
import type { BuildingConfig } from "./buildings/config";
import { townTileset } from "./tilesets/town";

export * from "./buildings/config";
export { maxWindows } from "./buildings/facade";
export { buildBuilding, buildingBox, buildingFootprint } from "./buildings/draw";

/**
 * A small map with one building on grass, `margin` blocks of grass on every side, for showing a building on its
 * own. Render it with `buildMap`.
 */
export function buildingMap(config?: BuildingConfig, margin = 1): TileMap {
    const { width, height } = buildingBox(config);
    const m = Number.isInteger(margin) && margin >= 0 ? margin : 1;
    const wide = Math.ceil(width / 2) + m * 2;
    const high = Math.ceil(height / 2) + m * 2;
    const rows = Array.from({ length: high }, () => "g".repeat(wide));
    return defineMap(townTileset, rows, [], [{ config, x: Math.floor((wide * 2 - width) / 2), y: Math.floor((high * 2 - height) / 2) }]);
}
