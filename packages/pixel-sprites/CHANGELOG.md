# Changelog

All notable changes to this package are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org/). Before 1.0, a breaking change bumps the
minor version.

To draft the next entry from the commit history, run `pnpm changelog pixel-sprites`. See
"Releases" in CLAUDE.md for the full flow.

<!-- next-release -->

## Unreleased

### Breaking changes
- **`bottomStyle: "shorts"` is now `"pants"`.** Short pants are `pants` at the default `bottomLength` of `short`, which is exactly what `shorts` drew, and it is the default bottom, so the default look does not change. An old `"shorts"` is no longer in the table, so it falls back to the default, which is those same pants.
- **`legPose: "step"` is replaced by the four frames of a walk.** `LegPose` is now `neutral`, `contactLeft` or `contactRight`, in front, back and side views, and `walkCycle` plays them as left, standing, right, standing. Replace `"step"` with a frame of `walkCycle`, which is also new. An unknown value, such as the old `"step"`, falls back to `neutral`.

### Added
- Skirts have a shape and a length, and there are pants. `bottomStyle: "skirt"` takes `skirtShape`, `flowing`, `pleated` or `pencil`, and `bottomStyle: "pants"` is new. Both take `bottomLength`: `short` (the one-row skirt it always was, or short pants), `knee`, `calf`, `ankle` or `floor`. A flowing skirt flares from the width of the legs, a pleated one flares the same and has a fold line down each pleat in the shadow colour, and a pencil skirt hugs the legs straight down. Flowing and pleated skirts sway when walking like the hair does (toward the planted foot from the front and back, back and forward in profile), and a pencil skirt does not. Pants are made from the legs in every pose, so they step, lift and tuck with them. Anything that reaches the shoes hangs over them, an ankle-length one stops just above the feet so only their last row shows, and a floor-length one covers them. Only a skirt has a shape, only a skirt or pants have a length, and a dress or overalls still hides them. Masks may now use `S` for a fold line, in the pleated skirts.
- Hair swishes when walking. A ponytail, pigtails or loose hair below the chin swings back and forth with the steps, in the same rhythm as the legs and arms: back, hanging, forward, hanging. The top of each lock stays on the head and the rows below it move further the lower they are, and hair accessories stay on their tie. Breaking: so that every pose keeps one size, the picture is made wide enough for the full swing, so avatars with back hair are a few pixels wider than before, in every pose, standing included (the default avatar goes from 16 to 18 wide, and one with a ponytail down the middle to 29, so that its tail can peek out past its sides). It is 24 tall as before.
- Hands. The end of each arm is now its own skin layer, drawn over the clothes with its own outline, so an arm swung in front overlaps the body. Every avatar's pixels change slightly because of it.
- Walk-cycle legs, footwear (boots, shoes, sandals) and, from the front and back, arms and sleeves that swing against the legs, for every view. The right-foot frame is the left-foot one flipped, and the back view is the front flipped. A side view cannot show which foot leads, so both feet share its stride.

## [0.9.0] - 2026-11-26

### Breaking changes
- **The package is now `@ragtechdev/pixel-sprites`.** Up to 0.8.0 it was published as `@ragtechdev/pixel-mask-engine`. The API and the built output are unchanged; only the name differs. To migrate, install `@ragtechdev/pixel-sprites`, change every `@ragtechdev/pixel-mask-engine` import to `@ragtechdev/pixel-sprites` (the `/canvas` and `/react` entries keep their names), and remove the old package. The old package is deprecated with a pointer here and gets no further releases.
- **The repository is now `ragTechDev/pixel-kit`, a pnpm workspace.** The library lives in `packages/pixel-sprites/`, and the studio is its own workspace package. For contributors, `src/`, `test/` and the library scripts moved there; the `pnpm` commands run from the repository root work as before.

### Changed
- **Releases are per package.** Tags are `<package>-v<version>` (this one is `pixel-sprites-v0.9.0`), each package keeps its own changelog, and the release workflow checks that the tag matches the package name and version before it publishes. `scripts/release.mjs` makes the version bump, commit and tag.
- **Studio:** now called Pixel Kit Studio, with install and import snippets for the new package name. It is served from `https://ragtechdev.github.io/pixel-kit/`.

## [0.8.0] - 2026-11-09

### Breaking changes
- **Back hair ids changed.** `loose` is now `looseBlunt`; `highPonytail` and `lowPonytail` are now `highPonytailRight` and `lowPonytailRight`; `doubleHighPonytail` and `doubleLowPonytail` are now `highPigtails` and `lowPigtails`; `shortCropped` is gone (use `looseBlunt` with `hairLength="ear"`). The default back style is `lowPonytailRight`. An id that no longer exists falls back to the default, as before.
- **Tiles, icons and clothes.** The default tile palette is replaced by the four seasons (unknown names, including `default`, fall back to summer). The `_idle` icon ids are removed in favour of `{ idle: true }`, and every icon is drawn on one 20×20 canvas. `fullOutfitStyle` and `outfitColor` are removed: use `topStyle="dress"` or `"overalls"` and `topColor`. `black` is no longer a clothes colour, and `bits` accepts only 1 or 2.

### Added
- **Every avatar view is drawn.** Facing left, right and back used to draw the front. Each body part, garment and hair style now has its own front and side mask, with left as the side flipped. Sleeves sit under the hair and head, and in profile the arm goes over the body clothes.
- **Hair length.** `hairLength` runs from `bald` through `ear`, `chin`, `shoulder` and `armpit` to `midBack`, and the back styles follow it: loose hair hangs to that length and a tail is as long as the hair. Ear length and bald only offer blunt loose hair.
- **Hair styles.** Loose hair is `looseBlunt`, `looseV` or `looseU` (the cuts start at shoulder length). Ponytails are high or low and sit on the right, the left or the middle; pigtails come in pairs. At chin length a high middle ponytail is a coconut-palm tuft.
- **Texture and drape.** `hairTexture` is `straight` (the default), `wavy`, `curly` or `coiled`. `hairDrape` puts the hair over the shoulders, behind them, or with a strand over each and the rest behind.
- **Hair accessories.** `hairAccessory` is a `hairtie`, `scrunchie` or `bow` on a ponytail or pigtails, in its own colour (`hairAccessoryColor`, which follows `clothesColor` until set).
- **Size, bit depth and palette options.** `size` (8 or 16), `bits` (1 or 2) and `palette` (six fixed four-colour presets) on every component, `toVariant` and `toMapVariant`.
- **Seasons and colours.** Seasonal tile palettes (spring, summer, autumn, winter) with seasonal trees and flowers; common colours or any validated hex colour for icons and objects, and a hex colour per group for tiles and maps (`tileColorGroups`); per-piece avatar colours (`topColor`, `bottomColor`, `shoeColor`) and wider palettes.
- **Icons.** `dice`, `reset`, `save` and `copy`.
- **Studio.** A browsable studio replaces the React demo and deploys to GitHub Pages: icons, tiles, objects, avatars and worlds, with code, downloads, every variant and palette, search and docs. The avatar creator has a hair length slider and controls for texture, styles, shoulders and accessories, and the avatar keeps its size however tall the hair is.

### Changed
- Front-facing avatars are unchanged except that sleeves now sit under the head, which shifts a few pixels at the chin corners.

### Fixed
- **Studio:** the popover no longer collapses on iPhone Safari, and it fits the visible screen when the browser toolbar is showing.


## [0.7.0] - 2026-11-08

### Added
- **React components for icons, objects and worlds.** `<Icon id="heart" />`, `<WorldObject id="tree" />` and `<World map={map} theme="autumn" />` join `<Avatar>` and `<Tile>`, so you no longer need `<PixelImage>` with a build call for these. Each takes `pixelSize`, `className` and `title`. `<PixelImage>` is still there for any `Raster` you build yourself.
- **Scaffolding wizard.** `pnpm new` scaffolds the mask files for a new icon, avatar garment, hair style, world object or tile, then lists the edits left to make.
- **Checks and docs tooling.** `pnpm check:masks` validates every mask, `pnpm stats` keeps the counts and bundled sizes in the README current (the tests fail when the counts are stale), and `pnpm docs:images` renders the README pictures from the built package.
- **CONTRIBUTING.md**, and a rewritten README with a rendered banner and examples.

### Changed
- Icon art now lives in lucide-style category folders (`social`, `communication`, `buildings` and so on), with one mask file per mask. `buildIcon` and every icon look the same, but `iconIds` is now listed in category order.
- Copyright for the code and the pixel art is now held by RAGTECH PTE. LTD. The licences (MIT for code, CC BY 4.0 for art) are unchanged.

## [0.6.0] - 2026-11-07

### Added
- **Navigation icons.** `cottage`, `quill` and `cog`, and three candidates for a feed icon: `cottage_row` (three small cottages with a little greenery, 16 pixels wide like the cottage), `willage_map` and `notice_board`. Each has a faded `_idle` copy for when it is not the current page, so `iconIds` lists both.

## [0.5.0] - 2026-11-07

### Added
- **Sky tile.** A pale `sky` tile in every fixed palette (a blue sky by default, a warm hazy one in `autumn`, a grey-blue one in `winter`), and a `k` sky block in `townTileset` (two by two sky tiles). It is a plain tile with a few lighter specks, for the strip of sky above a horizon.

## [0.4.0] - 2026-11-07

### Added
- **Icons.** Small coloured interface icons, drawn like world objects with an outline, shade and highlight in fixed colours: `buildIcon`, `iconIds`, `iconRamps` and `iconInk`. Like (`heart_empty`, `heart`), comment (`comment`), pass it on (`bird_letter_idle`, `bird_letter`, with `basket`, `bird_perch` and `winged_letter` as alternatives), send to one person (`envelope_idle`, `envelope`, with `mailbox` and `note_ribbon`) and save (`bookmark_idle`, `bookmark`, with `pinned_note` and `jar`). An action with an off and an on state has a faded off icon, and the faded icons share one soft outline colour.
- The demo has an Icons tab that groups the icons by use.

## [0.3.0] - 2026-11-07

### Added
- **townTileset:** `<` `=` `>` blocks make a roof one block high (ridge over eave: left, middle, right), so a small house is one roof block over one wall block (`"<==>"` over `"[__]"`, 8 by 4 tiles). The `1`-`9` blocks still make taller roofs.

### Fixed
- The demo's town house is 8 by 4 tiles instead of 8 by 8, so it is in proportion with the trees and objects.

## [0.2.0] - 2026-11-07

### Breaking changes
- The `tilePalette` colour array export is removed. Tile art now names its colours, and the fixed palettes are exported as `tilePalettes` and `tileThemes`. Tile colour indices no longer exist.

### Added
- **Worlds.** A tile, block, tileset and map layering: `defineTileSet`, `defineMap`, `buildMap`, `tileAt`, `queryCell` and `mapTileSize`, with the built-in `townTileset` and `houseTileset`. Maps store one character per block, and terrain behaviour (`solid`, `water`, `grass`) is a list of tile ids per tileset.
- **Objects.** Trees, fences, doors, windows, counters, bookshelves, rugs and flowers are shaded sprites placed on a map by tile coordinates: `buildObject`, `objectIds`, `objectInfo` and `objectRamps`. They are drawn as 0/1 silhouettes and shaded like avatar parts, and carry their own footprint and behaviour (solid, door, counter).
- **29 draft terrain tiles.** Grass, tall grass, path, water, shore, wall, floor, a roof nine-patch, beige pavement edges and corners, and house wall edges. `townTileset` assembles them with phone-keypad block keys (`1`-`9` roof, `A`-`I` pavement, `l h r` and `[ _ ]` wall).
- **Tile palettes.** Fixed palettes `default`, `autumn` and `winter` recolour the whole terrain: `buildTile(id, theme)`, `buildMap(map, theme)` and `<Tile theme>`. Unknown names fall back to `default`.
- The demo is split into an Avatar tab and a World tab with a palette switcher.

### Changed
- Tiles are drawn as 0/1 layers painted in named colours, like avatar parts. Edge and corner tiles are composed from shared edge strips instead of being separate art.
- The shore, four roof corners and two wall base corners differ slightly from earlier drafts. Every other tile is pixel-identical.
- Release notes now come from this file, and the release workflow checks that a section exists for the version before publishing.

### Security
- The dev-only esbuild dependency is pinned to 0.28.1 or newer (GHSA-g7r4-m6w7-qqqr, the dev server on Windows). It is not shipped in the package.

## [0.1.1] - 2026-11-06

- First release published from GitHub Actions with npm trusted publishing and a provenance attestation.

## [0.1.0] - 2026-11-06

- Initial release: avatar and tile rendering core, canvas and React entry points, MIT licence for code and CC BY 4.0 for art.
