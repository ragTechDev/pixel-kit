// Core entry: pure TypeScript, no React, no DOM.
export * from "./avatar/styles";
export { legPoses, walkCycle } from "./avatar/legPoses";
export * from "./core/palette";
export {
    buildAvatar,
    avatarKey,
    resolveAvatarConfig,
    defaultAvatarConfig,
    pieceColorFields,
    type PieceColorField,
    type ResolvedAvatarConfig,
    type AvatarConfig,
    type HeadOrientation
} from "./avatar/buildAvatar";
export { randomAvatar } from "./avatar/randomAvatar";
export { buildTile, tileIds } from "./world/tiles";
export { TILE_SIZE } from "./world/size";
export { tilePalettes, tileThemes, tileSeasons, defaultTileTheme, tileColorGroups, type TileColor, type TileColors, type TileColorGroup, type TileTheme } from "./world/tiles/palettes";
export type { TileId, RoadTileId, TownTileId, ObjectId } from "./world/types";
export { defineTileSet, type Block, type TileSet, type TileSetDefinition } from "./world/tileset";
export { defineMap, buildMap, mapDrawables, tileAt, queryCell, mapTileSize, type TileMap, type CellInfo, type PlacedObject, type PlacedBuilding, type MapDrawable, type MapDrawables } from "./world/map";
export { solidBoxes, doorBoxes, type Box } from "./world/solids";
export { buildObject, objectIds, objectInfo, objectColors, colorableObjectIds, seasonalObjectIds, objectDamage, type ObjectInfo, type ObjectDamage } from "./world/objects/objects";
export { objectRamps, type ObjectRampId } from "./world/objects/ramps";
export {
    buildBuilding, buildingBox, buildingFootprint, buildingMap, randomBuilding, resolveBuildingConfig, defaultBuildingConfig,
    buildingWidths, buildingStoreys, roofShapes, roofMaterials, buildingWings, buildingRooftops, roofPitches, buildingDepths, buildingWalls, doorPositions, doorStyles, windowStyles, MAX_WINDOWS, maxWindows,
    porches, chimneys, buildingProps, buildingColors, buildingDamage,
    type BuildingConfig, type ResolvedBuildingConfig, type BuildingWidth, type BuildingStoreys, type RoofShape, type BuildingWing, type BuildingRooftop, type RoofPitch, type BuildingDepth,
    type BuildingWall, type DoorPosition, type DoorStyle, type WindowStyle, type Porch, type Chimney,
    type BuildingProps, type BuildingColor, type MaterialColor, type RoofMaterial, type BuildingDamage
} from "./world/buildings";
export { townTileset } from "./world/tilesets/town";
export { houseTileset } from "./world/tilesets/house";
export type { Raster } from "./core/compose";
export type { Ramp } from "./core/sprite";
export { configKey, createCache, type Cache } from "./core/cache";
export { toSvg, toSvgPaths, toSvgDataUrl } from "./core/svg";
export { ICON_SIZE, iconIds, idleIconIds, colorableIconIds, iconColors, iconCategories, buildIcon, type IconColor, type IconId, type IconOptions } from "./icons/icons";
export { colorRamps, type ColorName } from "./core/colors";
export { parseHex, type HexColor } from "./core/customColor";
export type { IconCategory } from "./icons/categories";
export { iconRamps, iconInk } from "./icons/ramps";
export { toVariant, toMapVariant, variantSizes, colorDepths, palettePresets, paletteNames, type PalettePreset, type VariantOptions, type VariantSize, type ColorDepth } from "./core/variant";
