import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar, Icon, Tile, WorldObject } from "@ragtechdev/pixel-sprites/react";
import { clothesPalettes, collars, colorDepths, eyePalettes, hairPalettes, iconColors, objectColors, paletteNames, skinPalettes, bottomLengths, skirtShapes, sleeveLengths, tileThemes, topLengths, tucks, variantSizes } from "@ragtechdev/pixel-sprites";
import { CodeBlock } from "../ui";
import { docGroups, docSections, docTitle, type DocId, type DocTopic } from "./docTopics";

function Demo({ children }: { children: ReactNode }) {
    return <div className="demo">{children}</div>;
}

/** One page per topic. */
const pages: Record<DocId, () => ReactNode> = {
    start: () => (
        <>
            <p>
                Art is drawn as small text masks, shading is worked out by code, and colours come from fixed palettes. Everything you build is a <code>Raster</code>:
                a small grid of pixels you can show as a React component, an inline SVG, a CSS background or a canvas.
            </p>
            <CodeBlock code="npm install @ragtechdev/pixel-sprites" />
            <p>There are three entries. The core has no dependencies and no DOM. React is an optional peer.</p>
            <p className="muted">Want the art to move? <a href="#/docs/engine">A small game engine</a> walks it around a world, and <code>npm create @ragtechdev/pixel-game my-game</code> starts a whole game.</p>
            <table>
                <tbody>
                    <tr><td><code>@ragtechdev/pixel-sprites</code></td><td>builders such as <code>buildIcon</code>, <code>toSvg</code>, <code>toVariant</code></td></tr>
                    <tr><td><code>…/react</code></td><td><code>Icon</code>, <code>Avatar</code>, <code>Tile</code>, <code>WorldObject</code>, <code>World</code>, <code>PixelImage</code></td></tr>
                    <tr><td><code>…/canvas</code></td><td><code>paintRaster</code>, <code>drawRaster</code></td></tr>
                </tbody>
            </table>
        </>
    ),
    icons: () => (
        <>
            <p>Pick an id from <code>iconIds</code> (the Icons page lists them with their categories). <code>pixelSize</code> is how many screen pixels each icon pixel takes.</p>
            <Demo><Icon id="heart" pixelSize={4} title="Like" /><Icon id="heart_empty" pixelSize={4} /><Icon id="cottage" pixelSize={4} /></Demo>
            <CodeBlock code={`import { Icon } from "@ragtechdev/pixel-sprites/react";

<Icon id="heart" pixelSize={4} title="Like" />`} />
            <p>
                Some icons (<code>idleIconIds</code> lists them) have a faded look for something that is off or not the current page. It is an option, not a separate icon. Icons without one ignore it.
            </p>
            <Demo><Icon id="cottage" pixelSize={4} /><Icon id="cottage" idle pixelSize={4} /><Icon id="envelope" pixelSize={4} /><Icon id="envelope" idle pixelSize={4} /></Demo>
            <CodeBlock code={`<Icon id="cottage" idle />

// or, without React
buildIcon("cottage", { idle: true });`} />
        </>
    ),
    avatars: () => (
        <>
            <p>An avatar is plain data: ids from fixed tables. Unknown values fall back to a default, so configs loaded from storage are always safe.</p>
            <Demo><Avatar pixelSize={4} skinTone="medium" hairColor="black" topStyle="top" /></Demo>
            <CodeBlock code={`<Avatar skinTone="medium" hairColor="black" topStyle="top" pixelSize={4} />`} />
        </>
    ),
    worlds: () => (
        <>
            <p>Tiles recolour with a palette (<code>spring</code>, <code>summer</code> as the default, <code>autumn</code>, <code>winter</code>, and <code>ash</code> for a war-torn city, which is not a season: <code>tileSeasons</code> lists the four that come round). Objects stand on terrain, and trees and flowers change with the palette too. A map is one character per block of terrain plus placed objects.</p>
            <Demo>{tileThemes.map((t) => <Tile key={t} id="grass" theme={t} pixelSize={4} />)}</Demo>
            <CodeBlock code={`import { World, Tile, WorldObject } from "@ragtechdev/pixel-sprites/react";

<Tile id="grass" theme="autumn" />
<WorldObject id="tree" />
<World map={map} theme="winter" pixelSize={2} />`} />
            <p>
                A building is chosen from fixed lists, like an avatar, and drawn from them: roof shape and pitch, wall material, storeys and width, the door and its step, windows, a chimney, props at the front, and colours for the roof, walls, trim and door.
                It is seen from the front and a little above, as in most pixel-art games. Put one on a map with the fourth argument of <code>defineMap</code>, with <code>x</code> and <code>y</code> in tiles. Its walls and roof are solid, and the tile at the foot of its door is open and has <code>door</code> set, so a walker can step in.
            </p>
            <CodeBlock code={`import { defineMap, townTileset } from "@ragtechdev/pixel-sprites";
import { Building } from "@ragtechdev/pixel-sprites/react";

const map = defineMap(townTileset, Array(8).fill("gggggggg"), [], [
  { config: { width: 7, storeys: 2, roof: "gable", wall: "brick", roofColor: "blue" }, x: 2, y: 1 }
]);

<Building roof="gable" wall="brick" roofColor="blue" pixelSize={4} />`} />
            <p>
                A tent, for a camp or a shelter, is its own small thing next to buildings: <code>buildTent</code> (or <code>{"<Tent>"}</code>) with a <code>style</code> (<code>"ridge"</code>, <code>"dome"</code> or <code>"lean"</code>), a <code>size</code> of 3, 4 or 5 tiles wide, a <code>color</code> and <code>damage</code> (<code>"none"</code> or <code>"ruin"</code>, a collapsed one).
                Put one on a map with the fifth argument of <code>defineMap</code>: the canvas is solid and the foot of its doorway is open, with <code>door</code> set.
            </p>
            <CodeBlock code={`import { buildTent, defineMap, townTileset } from "@ragtechdev/pixel-sprites";
import { Tent } from "@ragtechdev/pixel-sprites/react";

const map = defineMap(townTileset, Array(8).fill("gggggggg"), [], [], [
  { config: { style: "dome", size: 4, color: "green" }, x: 2, y: 1 }
]);

buildTent({ style: "ridge", damage: "ruin" });
<Tent style="lean" tentSize={5} pixelSize={4} />`} />
            <p>An object placed on a map can also take a <code>color</code> (<code>{'{ id: "door", x: 3, y: 2, color: "blue" }'}</code>), a common colour or a hex colour, for the objects that have one.</p>
            <p>
                For a war-torn city there is a fifth palette, <code>ash</code> (dead grass, soot, smoke and burnt trees; it is not a season), five damaged ground tiles, and blocks for them in <code>townTileset</code>: <code>J</code> road, <code>M</code> cracked road, <code>L</code> cracked pavement, <code>N</code> scorched earth, <code>O</code> rubble and <code>Q</code> rubble in scorched earth. The <a href="#/worlds">Ruins map</a> is built from them.
            </p>
            <Demo>{(["scorched_earth", "rubble", "cracked_road", "cracked_pavement", "broken_floor"] as const).map((id) => <Tile key={id} id={id} theme="ash" pixelSize={4} />)}</Demo>
            <CodeBlock code={`import { buildMap, defineMap, tileSeasons, townTileset } from "@ragtechdev/pixel-sprites";

const map = defineMap(townTileset, ["NOQ", "LMJ"], [{ id: "tree", x: 0, y: 0, damage: "ruin" }]);
buildMap(map, "ash");   // ash is a palette, not a season
tileSeasons;            // the four that come round: spring, summer, autumn, winter`} />
            <p>
                Buildings and objects can be shown damaged by war. <code>damage</code> is <code>"half"</code> or <code>"ruin"</code>: a building loses a corner and part of its roof (or most of its walls) and shows the rooms inside, a window loses its glass, a bookshelf its books, a tree is blasted down to its branches and then burns to a trunk.
                It is the same every time for the same thing, keeps its colours, and does not change what blocks movement.
            </p>
            <Demo>
                <WorldObject id="tree" pixelSize={3} /><WorldObject id="tree" damage="half" pixelSize={3} /><WorldObject id="tree" damage="ruin" pixelSize={3} />
                <WorldObject id="bookshelf" damage="half" pixelSize={3} /><WorldObject id="window" damage="half" pixelSize={3} /><WorldObject id="rug" damage="half" pixelSize={3} />
            </Demo>
            <CodeBlock code={`import { buildBuilding, buildObject, defineMap, townTileset } from "@ragtechdev/pixel-sprites";

buildBuilding({ wall: "stone", damage: "ruin" });
buildObject("window", undefined, undefined, "half");   // season, colour, then damage

defineMap(townTileset, Array(4).fill("gggg"), [{ id: "tree", x: 1, y: 1, damage: "ruin" }]);`} />
        </>
    ),
    variants: () => (
        <>
            <p>
                Every asset can be shown on a {variantSizes.map((s) => `${s}x${s}`).join(" or ")} grid, and with {colorDepths.join(" or ")} bits of colour. Pass <code>size</code> and <code>bits</code> to any component,
                or call <code>toVariant</code> on a raster.
            </p>
            <Demo>
                <Icon id="heart" pixelSize={6} />
                <Icon id="heart" size={16} pixelSize={6} />
                <Icon id="heart" size={8} pixelSize={6} />
                <Icon id="heart" size={8} bits={2} pixelSize={6} />
                <Icon id="heart" size={8} bits={1} pixelSize={6} />
            </Demo>
            <ul>
                <li><code>size</code> fits the image inside the square and centres it. Shapes keep their proportions. Shrinking keeps the most common colour in each block, and small images are only enlarged by whole numbers.</li>
                <li>For <code>World</code> and <code>toMapVariant</code>, <code>size</code> is the pixels per tile (8 or 16), not the size of the whole map, so the map keeps its tiles and proportions. 16 is the original.</li>
                <li><code>bits</code> uses fixed palettes: 1 is black and white and 2 is four greys. Transparent pixels stay transparent. Leave it out for the original colours.</li>
                <li><code>palette</code> swaps in one of six fixed four-colour palettes ({paletteNames.join(", ")}) by brightness: each colour takes the palette tone for its own brightness, so an idle icon stays faded. It is applied after <code>bits</code>, for example <code>{'<Icon id="heart" bits={2} palette="game-boy" />'}</code> or <code>toVariant(raster, {"{ palette: \"sepia\" }"})</code>.</li>
                <li>Any other value is ignored and gives you the original, which keeps its own grid and its full colours. Every icon is drawn on the same 20x20 canvas, so icons share one default size.</li>
            </ul>
            <CodeBlock code={`import { buildTile, toVariant } from "@ragtechdev/pixel-sprites";

const retro = toVariant(buildTile("grass"), { size: 8, bits: 1 });`} />
        </>
    ),
    together: () => (
        <>
            <p>
                Each kind comes on its own grid. Tiles are 16x16 (one world tile). Objects cover whole tiles: 16x16, 16x32, 32x16 or 32x32. An avatar is about 24 tall and 15 to 29 wide, wider with hair that swishes out when it walks. Every icon is drawn on one 20x20 canvas.
                On one surface, show them at their original size with one shared <code>pixelSize</code>. Every art pixel is then the same physical size, so mixed assets look like they belong together.
            </p>
            <Demo>
                <Tile id="path" pixelSize={4} />
                <WorldObject id="door" pixelSize={4} />
                <Avatar pixelSize={4} />
                <Icon id="cottage" pixelSize={4} />
            </Demo>
            <CodeBlock code={`const PX = 4; // one value for the whole surface

<Tile id="path" pixelSize={PX} />
<WorldObject id="door" pixelSize={PX} />
<Avatar pixelSize={PX} />
<Icon id="cottage" pixelSize={PX} />`} />
            <ul>
                <li><strong>World scenes</strong> (tiles, objects, avatars) share the 16 pixel tile grid, so they stay in proportion. An avatar is about a tile and a half tall, so it fits through a door.</li>
                <li><strong>Icons beside world art</strong> are 20 pixels against a 16 pixel tile. That reads as interface next to scenery. Do not use an icon where you mean a tile-sized object.</li>
                <li><strong><code>size</code> fits each asset into its own box</strong>, so the shrink factor differs: a 20 pixel icon at <code>size=&#123;8&#125;</code> shrinks by 0.4, a tile by 0.5 and an avatar by about 0.33. Mixed kinds at one <code>size</code> end up with different effective pixel sizes. Use <code>size</code> to pick a tier within one kind, such as all icons at 16x16.</li>
                <li><strong><code>bits</code> is safe to mix</strong>, because a 1 or 2-bit palette is the same for every kind.</li>
            </ul>
        </>
    ),
    colours: () => (
        <>
            <p>
                Every colour the library draws comes from a fixed table, so what you build is always one of the named looks below. Pick by name; there is no way to pass a colour of your own to the library.
            </p>
            <h3>Avatars</h3>
            <p>Each part has its own list. Skin: {Object.keys(skinPalettes).join(", ")}. Hair: {Object.keys(hairPalettes).join(", ")} (<code>brown</code> is brunette). Eyes: {Object.keys(eyePalettes).join(", ")}. Clothes: {Object.keys(clothesPalettes).join(", ")}. <code>clothesColor</code> colours every piece; <code>topColor</code>, <code>bottomColor</code> and <code>shoeColor</code> give one piece a colour of its own. A top is <code>topStyle="top"</code>, with a <code>topLength</code> ({Object.keys(topLengths).join(", ")}), a <code>sleeveLength</code> ({Object.keys(sleeveLengths).join(", ")}) and a <code>collar</code> ({Object.keys(collars).join(", ")}); a <code>hip</code> or <code>tunic</code> top over a bottom hangs over it unless <code>tuck</code> is <code>tucked</code>; the choices are {Object.keys(tucks).join(", ")}. Set <code>tuck="onePiece"</code> to join the top and the bottom into one garment with no seam between them, such as a dress (a top over a skirt) or overalls (straps over pants), in the top colour. A skirt is <code>bottomStyle="skirt"</code> with a <code>skirtShape</code> ({Object.keys(skirtShapes).join(", ")}), and pants are <code>bottomStyle="pants"</code>. Both take a <code>bottomLength</code> ({Object.keys(bottomLengths).join(", ")}, where <code>floor</code> covers the feet). Flowing and pleated skirts sway when walking, a pencil skirt does not, and pants step with the legs.</p>
            <Demo>{(["blonde", "brown", "red", "auburn", "grey", "pink"] as const).map((hairColor) => <Avatar key={hairColor} hairColor={hairColor} pixelSize={3} />)}</Demo>
            <CodeBlock code={`<Avatar skinTone="tan" hairColor="auburn" eyeColor="hazel" clothesColor="teal" />

// a different colour for single pieces
<Avatar clothesColor="blue" topColor="red" shoeColor="yellow" />`} />
            <h3>Icons and objects</h3>
            <p>
                Icons with a main colour (<code>colorableIconIds</code>) and objects with one (<code>colorableObjectIds</code>) take a common colour. Icons accept {iconColors.join(", ")}.
                Each object has its own list, for example doors: {objectColors.door?.join(", ")}; trees: {objectColors.tree?.join(", ")}. A colour replaces the main colour and leaves the rest (a door knob, a bark trunk) alone. On a tree or flower it wins over the season.
            </p>
            <Demo>
                <Icon id="heart" pixelSize={3} /><Icon id="heart" color="blue" pixelSize={3} /><Icon id="heart" color="purple" pixelSize={3} />
                <Icon id="mailbox" color="red" pixelSize={3} /><Icon id="cottage" color="teal" pixelSize={3} />
                <WorldObject id="door" color="green" pixelSize={3} /><WorldObject id="door" color="blue" pixelSize={3} /><WorldObject id="tree" color="pink" pixelSize={3} />
            </Demo>
            <CodeBlock code={`<Icon id="heart" color="blue" />
<WorldObject id="door" color="green" />

buildIcon("heart", { color: "blue" });
buildObject("door", undefined, "green");   // the second argument is the season`} />
            <p>Icons, objects and tiles also take any hex colour, written <code>#rgb</code> or <code>#rrggbb</code>. The other tones are shaded from it the same way every time.</p>
            <CodeBlock code={`<Icon id="heart" color="#e8873a" />
<WorldObject id="door" color="#336699" />
<Tile id="grass" colors={{ grass: "#5fae3c" }} />
<World map={map} colors={{ water: "#2a6f97", roof: "#7a3b8f" }} />

buildIcon("heart", { color: "#e8873a" });
buildTile("grass", "summer", { grass: "#5fae3c" });
buildMap(map, "summer", { water: "#2a6f97" });   // groups: grass, water, path, roof, pavement`} />
            <p>An unknown colour, an invalid hex value, or one that is not offered for that item is ignored and gives the original. Avatars only take their fixed presets.</p>
            <h3>Custom colours in the studio</h3>
            <p>
                In the studio you can go further: change any single colour with a colour picker, swap in a whole palette (presets such as Game Boy, or ones you save yourself), or pick a custom colour for the avatar's hair, skin, eyes or clothes.
                These change the preview and the PNG or SVG you save. Hex colours for icons, objects and tiles are also in the code (above); avatar custom colours and palette swaps are studio-only, because avatars keep to fixed palettes by design.
            </p>
        </>
    ),
    "outside-react": () => (
        <>
            <CodeBlock code={`import { buildIcon, toSvg, toSvgDataUrl } from "@ragtechdev/pixel-sprites";
import { drawRaster } from "@ragtechdev/pixel-sprites/canvas";

img.src = toSvgDataUrl(buildIcon("heart"), 4);        // 4 screen pixels per icon pixel
el.style.backgroundImage = \`url("\${toSvgDataUrl(buildIcon("heart"), 2)}")\`;
const markup = toSvg(buildIcon("heart"), 4);           // an SVG string
drawRaster(ctx, buildIcon("heart"), 0, 0, 4);          // nearest-neighbour canvas`} />
        </>
    ),
    engine: () => (
        <>
            <p>
                <code>@ragtechdev/pixel-engine</code> is a small runtime for tile-based worlds built from the sprites package: a fixed-step loop, keys, a camera, movement a tile at a time, doors and scenes.
                The core has no framework and no DOM, so it runs the same in a browser, a test or on a server. A React component and a browser helper are separate entries.
            </p>
            <CodeBlock code="npm install @ragtechdev/pixel-engine @ragtechdev/pixel-sprites" />
            <p>
                Or start a whole game with one command. It writes a Vite and TypeScript project, with a town and a house to walk around, that already uses both packages and keeps the kit's supply-chain
                settings. It only writes files; it never installs anything or runs a command for you.
            </p>
            <CodeBlock code={`npm create @ragtechdev/pixel-game my-game
cd my-game
pnpm install
pnpm dev`} />
            <p>There are three entries, and the sprites package is a peer dependency:</p>
            <table>
                <tbody>
                    <tr><td><code>@ragtechdev/pixel-engine</code></td><td>the loop, input, camera, walker, scenes and <code>createGame</code>. No DOM.</td></tr>
                    <tr><td><code>…/dom</code></td><td><code>attachKeyboard</code>, <code>defaultKeymap</code> and <code>start</code>, which runs a game on a canvas</td></tr>
                    <tr><td><code>…/react</code></td><td><code>GameView</code> and <code>useGame</code></td></tr>
                </tbody>
            </table>
            <h2>A hero on a map</h2>
            <p>
                This walks a hero around a small map. Water and tree trunks stop them, because collision reads the same tile and object data that drew the map.
            </p>
            <CodeBlock code={`import { buildAvatar, buildMap, defineMap, mapTileSize, townTileset, TILE_SIZE } from "@ragtechdev/pixel-sprites";
import { drawRaster } from "@ragtechdev/pixel-sprites/canvas";
import { createCamera, createGame, createWalker, isWalkable } from "@ragtechdev/pixel-engine";
import { attachKeyboard, start } from "@ragtechdev/pixel-engine/dom";

const map = defineMap(townTileset, ["gggg", "gwgg", "gggg"]);
const ground = buildMap(map);
const tiles = mapTileSize(map);
const camera = createCamera({ width: 128, height: 96 }, { width: tiles.width * TILE_SIZE, height: tiles.height * TILE_SIZE });

const sprites = {
    up: buildAvatar({ headOrientation: "back" }),
    down: buildAvatar({ headOrientation: "front" }),
    left: buildAvatar({ headOrientation: "left" }),
    right: buildAvatar({ headOrientation: "right" })
};

const game = createGame({
    scene: (game) => {
        const hero = createWalker({ x: 1, y: 0 });
        const canEnter = (x, y) => isWalkable(map, x, y);
        return {
            update(dt) {
                const direction = game.input.heldDirection();
                if (direction) hero.walk(direction, canEnter);
                hero.update(dt);
                camera.follow(hero.x + TILE_SIZE / 2, hero.y + TILE_SIZE / 2);
            },
            render(ctx) {
                drawRaster(ctx, ground, -camera.x, -camera.y);
                // The avatar is a tile and a half tall, so it stands 8 px above its tile.
                drawRaster(ctx, sprites[hero.facing], hero.x - camera.x, hero.y - camera.y - 8);
            }
        };
    }
});

const canvas = document.querySelector("canvas");
canvas.tabIndex = 0; // a canvas needs focus to receive keys
attachKeyboard(canvas, game.input);
const stop = start(game, canvas, { width: 128, height: 96, scale: 4 });`} />
            <p>
                The canvas holds one pixel per game pixel and the browser scales it up without smoothing, so <code>scale</code> has to be a whole number. Click the canvas to focus it, then:
            </p>
            <table>
                <tbody>
                    <tr><td>Arrow keys or WASD</td><td><code>up</code>, <code>down</code>, <code>left</code>, <code>right</code></td></tr>
                    <tr><td>Space or Z</td><td><code>a</code></td></tr>
                    <tr><td>X or Escape</td><td><code>b</code></td></tr>
                    <tr><td>Enter</td><td><code>start</code></td></tr>
                </tbody>
            </table>
            <h2>In React</h2>
            <CodeBlock code={`import { GameView, useGame } from "@ragtechdev/pixel-engine/react";

function Town() {
    const game = useGame(createTownGame); // builds the game once; createGame as above
    return <GameView game={game} width={128} height={96} scale={4} title="A small town" autoFocus />;
}`} />
            <p>
                <code>GameView</code> mounts the canvas, runs the game and stops it on unmount. By default it reads keys only while the canvas has focus, so a page with forms keeps its keys;
                pass <code>keyboard="window"</code> to listen everywhere.
            </p>
            <p>
                The <a href="#/play">Play page</a> is a bigger world built the same way, with doors, characters and seasons. <a href="#/play/code">Its whole source</a> is shown there.
            </p>
        </>
    ),
    "engine-loop": () => (
        <>
            <h2>The loop</h2>
            <p>
                Game logic runs in fixed steps, 60 a second by default, whatever the display's refresh rate. <code>createLoop</code> owns no timer: you feed it the real time that passed, in seconds,
                and it runs as many whole steps as that covers.
            </p>
            <CodeBlock code={`import { createLoop } from "@ragtechdev/pixel-engine";

const loop = createLoop({ update: (dt) => world.step(dt) }); // dt is 1/60
const { steps, alpha } = loop.advance(elapsedSeconds);
// alpha, from 0 to 1, is how far the clock is into the next step: draw between two updates with it`} />
            <ul>
                <li><strong>A hidden tab does not burst.</strong> One <code>advance</code> catches up on at most <code>maxFrame</code> seconds (a quarter of a second by default), not thousands of updates.</li>
                <li><strong>Bad time is ignored.</strong> Negative, <code>NaN</code> and infinite time run no steps.</li>
                <li><strong>It is deterministic.</strong> The same inputs give the same steps, so a test can drive it a frame at a time.</li>
            </ul>
            <p>
                <code>createGame</code> ties the loop, the input and a scene stack together. <code>game.advance(seconds)</code> runs the current scene's updates and <code>game.render(ctx)</code> draws it.
                In a browser, <code>start</code> from <code>…/dom</code> calls them from <code>requestAnimationFrame</code>.
            </p>
            <h2>Input</h2>
            <p>
                Players act through a fixed set of actions: <code>up</code>, <code>down</code>, <code>left</code>, <code>right</code>, <code>a</code>, <code>b</code> and <code>start</code>. Keys, buttons and touches are mapped onto them,
                and anything else is ignored.
            </p>
            <CodeBlock code={`const input = game.input;

input.isDown("b");          // held right now
input.wasPressed("a");      // went down since the last update, for one update only
input.heldDirection();      // "up", "down", "left", "right" or undefined; the last one pressed wins`} />
            <ul>
                <li><strong>A press is seen once.</strong> <code>wasPressed</code> is true for one update, even when a frame runs two.</li>
                <li><strong>A quick tap still counts.</strong> A key or touch let go before the next update is held for that update, so a fast tap takes a step.</li>
                <li><strong>The last direction wins.</strong> Hold left, then up, and <code>heldDirection()</code> is <code>up</code>; let go of up and it is <code>left</code> again.</li>
            </ul>
            <p>
                In a browser, <code>attachKeyboard</code> maps keys by position (<code>event.code</code>), so it works on any keyboard layout. Keys pressed with Ctrl, Cmd or Alt are never taken, and everything is released when the canvas loses focus.
                Pass your own map to change the keys.
            </p>
            <CodeBlock code={`import { attachKeyboard, defaultKeymap } from "@ragtechdev/pixel-engine/dom";

attachKeyboard(canvas, game.input, { ...defaultKeymap, KeyJ: "a", KeyK: "b" });`} />
            <p>For a touch screen, call <code>input.press("left")</code> and <code>input.release("left")</code> from your own buttons. The Play page does this for its on-screen pad.</p>
            <h2>The camera</h2>
            <p>
                A camera follows a point and stays inside the world. Its origin is always a whole number, so pixels never smear, and a world smaller than the view is centred instead of pinned to a corner.
            </p>
            <CodeBlock code={`import { createCamera } from "@ragtechdev/pixel-engine";

const camera = createCamera({ width: 240, height: 144 }, { width: 320, height: 288 });
camera.follow(hero.x + 8, hero.y + 8);                  // centre on a world pixel, then clamp
drawRaster(ctx, ground, -camera.x, -camera.y);          // draw the world shifted by the camera`} />
            <p>
                <code>camera.setBounds</code> re-fits it when you change to a map of another size, and <code>cameraOrigin</code> is the same calculation as a pure function, for tests or your own camera.
            </p>
        </>
    ),
    "engine-world": () => (
        <>
            <h2>Walking</h2>
            <p>
                A walker moves one tile at a time and is drawn smoothly in between. Give it a tile to start on and, optionally, a speed in tiles per second (four by default).
            </p>
            <CodeBlock code={`import { createWalker, isWalkable } from "@ragtechdev/pixel-engine";

const hero = createWalker({ x: 7, y: 8, facing: "up" });

const result = hero.walk("up", (x, y) => isWalkable(map, x, y)); // "moved", "blocked" or "busy"
const arrived = hero.update(dt);                                  // true on the update it reaches the next tile

hero.tx; hero.ty;   // the tile it stands on (the one it is leaving, mid-step)
hero.x; hero.y;     // its position in world pixels, rounded, for drawing`} />
            <ul>
                <li><strong>A blocked step still turns the walker</strong> to face the way it tried, which is what you want when someone bumps into a wall.</li>
                <li><strong>A walker mid-step is <code>busy</code></strong> and keeps its direction until it arrives.</li>
                <li><code>hero.teleport(x, y, facing)</code> puts it on a tile at once, which is how you place it after a warp.</li>
            </ul>
            <h2>Walking freely</h2>
            <p>
                A mover is not tied to tiles: it stands at any pixel, moves a pixel at a time and stops flush against whatever is in its way, so it can come right up to the drawn outline of a wall.
                Its position is the top-left of a tile-sized cell, and only a small box at the bottom of the cell, the feet, collides (10 by 4 pixels by default).
            </p>
            <CodeBlock code={`import { createMover, isOpen } from "@ragtechdev/pixel-engine";

const hero = createMover({ x: 7 * 16, y: 8 * 16, facing: "up" });

// Each update: walk in the direction held (or undefined to stand still); pass 2 as the last argument to run.
hero.step(dt, input.heldDirection(), (feet) => isOpen(map, feet));

hero.x; hero.y;   // world pixels, for drawing
hero.feet;        // the colliding box; its bottom edge is the line it stands on`} />
            <p>
                <code>isOpen(map, box, also)</code> is false off the map and on anything in <code>solidBoxes(map)</code>, plus any boxes you pass as <code>also</code>, such as a character.
                Terrain and water fill whole tiles. A standing object is solid where it is drawn on its blocking cells, so a tree is its trunk. A building is solid where its wall is drawn, from the outline on each side to the line it stands on, and the foot of its door is open, so a mover can walk in without lining up to the pixel (<code>assist</code> nudges it round a corner, and is off by default).
            </p>
            <h2>Behind a building</h2>
            <p>
                The roof rows of a building are open, so a mover can walk up behind it. To have the building cover it, draw with <code>mapDrawables</code> instead of <code>buildMap</code>: the ground first, then each standing object and building, and the movers, sorted by the pixel row they stand on.
            </p>
            <CodeBlock code={`import { mapDrawables } from "@ragtechdev/pixel-sprites";

const { ground, standing } = mapDrawables(map, "summer");
drawRaster(ctx, ground, -camera.x, -camera.y);
const things = [
    ...standing.map((d) => ({ sortY: d.sortY, x: d.x, y: d.y, raster: d.raster })),
    { sortY: hero.y + 16, x: hero.x, y: hero.y - 8, raster: heroRaster },
].sort((a, b) => a.sortY - b.sortY);
for (const t of things) drawRaster(ctx, t.raster, t.x - camera.x, t.y - camera.y);`} />
            <p>
                A door is a box too: <code>doorBoxes(map)</code> lists them, and when the mover's <code>feet</code> overlap one (<code>overlaps(a, b)</code>), it is the moment to warp.
            </p>
            <h2>Picking things up</h2>
            <p>
                <code>createCarry</code> shows an avatar picking an object up and holding on to it: it bends, lifts the object overhead, shows it for a moment, then carries it in front, out toward where it faces.
                It draws nothing. It counts the time and says where the object and the avatar go on each frame, so any picture can be carried, and it holds whatever you give it (here, the id of the fruit).
            </p>
            <CodeBlock code={`import { createCarry } from "@ragtechdev/pixel-engine";

const carry = createCarry();

// Pick it up from where it lies: the object's top-left, relative to the avatar's.
carry.pickUp("fruit_apple", { x: 6, y: 24 });

// Each update (carry.busy is true until it is held, so keep the avatar still for it).
carry.update(dt);

// Each render: where to draw the avatar's crouch and the object. Undefined when nothing is held.
const pose = carry.pose({ width: 22, height: 24 }, { width: 10, height: 10 }, hero.facing);
// pose.x, pose.y: the object's top-left, relative to the avatar. pose.crouch: draw the avatar this much lower.
// pose.behind: draw the avatar over the object (its back is turned).

carry.drop();     // puts it down and gives it back`} />
            <h2>Showing something over something else</h2>
            <p>
                <code>createPopups</code> puts a picture on top of another for a moment: a heart over a character, a mark over a door.
                It draws nothing and takes any item, an icon, an object or an avatar, so what appears and what it appears on is up to you.
                A popup is centred above a rectangle, or above a function that gives the rectangle each frame, so it follows something that moves. It floats up a little and fades out.
            </p>
            <CodeBlock code={`import { createPopups } from "@ragtechdev/pixel-engine";

const popups = createPopups();

// Over a character: its rectangle (or a function, if it moves), and the size of what appears. A key restarts the same popup if you show it again.
popups.show("heart", { x: 72, y: 56, width: 22, height: 24 }, { width: 12, height: 11 }, "npc");

// Each update, then each render.
popups.update(dt);
for (const popup of popups.active) {
    // popup.item, popup.x and popup.y (top-left, world pixels), popup.alpha (1 falling to 0 as it fades)
}

popups.clear();   // removes them all`} />
            <h2>What blocks the way</h2>
            <p>
                <code>isWalkable</code> reads the sprites package's map data, so collision always agrees with what you drew. It is false off the map, on solid terrain, on water, and on the blocking cells of an object.
                A tree's canopy is open and its trunk blocks.
            </p>
            <p>
                You decide what else blocks by writing your own <code>canEnter</code>. The Play page keeps characters in the way like this:
            </p>
            <CodeBlock code={`const canEnter = (x, y) =>
    isWalkable(map, x, y, { doors: true }) && !characters.some((c) => c.x === x && c.y === y);`} />
            <h2>Doors</h2>
            <p>
                A door in a wall sits on a solid tile, so by default a walker cannot step onto it. Pass <code>{`{ doors: true }`}</code> and a door counts as open. When <code>update</code> reports the arrival, ask the map whether the tile is a door and switch scenes:
            </p>
            <CodeBlock code={`import { queryCell } from "@ragtechdev/pixel-sprites";

if (hero.update(dt) && queryCell(map, hero.tx, hero.ty)?.door) {
    game.scenes.replace(insideScene);   // a new scene places the hero on the other side with hero.teleport(...)
}`} />
            <h2>Scenes</h2>
            <p>
                A scene is one screen of a game: a title, a map, a menu. It has an <code>update(dt)</code> and a <code>render(ctx, alpha)</code>, and optionally <code>enter</code> and <code>exit</code>.
                Scenes live on a stack, and only the top one updates and renders.
            </p>
            <CodeBlock code={`game.scenes.push(menuScene);      // enter() runs; the menu is on top
game.scenes.pop();                // exit() runs; the scene below is current again
game.scenes.replace(nextScene);   // exit the top one, enter the next, same depth`} />
            <p>
                The Play world's game logic, a town, a house and the doors between them, is about 130 lines. <a href="#/play/code">Read it there</a> or try it on the <a href="#/play">Play page</a>.
            </p>
        </>
    ),
    rules: () => (
        <>
            <ul>
                <li><strong>Constrained by design.</strong> Art is fixed masks and fixed palettes. The library never accepts arbitrary images, avatars never accept arbitrary colours, and icons, objects and tiles accept only a validated hex colour.</li>
                <li><strong>Fixed actions.</strong> The engine reads a fixed set of actions (<code>up</code>, <code>down</code>, <code>left</code>, <code>right</code>, <code>a</code>, <code>b</code>, <code>start</code>). Keys and buttons map onto them, and there is no way to run user-supplied code or art.</li>
                <li><strong>Small on purpose.</strong> Each part is tree-shakeable, so you ship only what you import.</li>
                <li><strong>Made in code.</strong> No generated images or video: everything renders from code at a fraction of the resources.</li>
                <li><strong>Licences.</strong> Code is MIT. Art is CC BY 4.0.</li>
            </ul>
            <p className="muted">The full reference is in the <a href="https://github.com/ragTechDev/pixel-kit/tree/main/packages/pixel-sprites#readme">README on GitHub</a>.</p>
        </>
    )
};

export function DocsPage({ topic }: { topic?: string }) {
    const id = (docSections.find(([known]) => known === topic)?.[0] ?? "start") as DocId;
    return (
        <div className="docs-layout">
            <DocsNav current={id} />
            <div className="docs">
                <article className="prose">
                    <h1 className="h" style={{ fontSize: 22 }}>{docTitle(id)}</h1>
                    {pages[id]()}
                    <PageLinks from={id} />
                </article>
            </div>
        </div>
    );
}

/**
 * The topics, grouped. Beside the page on a wide screen; on a narrow one a bar shows the current topic and opens the whole list,
 * because a row of a dozen links does not fit a phone and is hard to scan on any screen.
 */
function DocsNav({ current }: { current: DocId }) {
    const [open, setOpen] = useState(false);
    const nav = useRef<HTMLElement>(null);
    // Choosing a topic closes the list.
    useEffect(() => setOpen(false), [current]);
    // The list is as tall as the screen less the bar, so it only fits once the bar is at the top: bring it there as it opens.
    const toggle = () => {
        setOpen(!open);
        if (!open) requestAnimationFrame(() => nav.current?.scrollIntoView({ block: "start" }));
    };
    return (
        <nav ref={nav} className="docs-nav" aria-label="Docs topics" data-open={open || undefined} onKeyDown={(event) => event.key === "Escape" && setOpen(false)}>
            <button type="button" className="docs-nav-toggle" aria-expanded={open} aria-controls="docs-topics" onClick={toggle}>
                <span className="docs-nav-kicker">Topic</span>
                <span className="docs-nav-current">{docTitle(current)}</span>
                <span aria-hidden>{open ? "▲" : "▼"}</span>
            </button>
            <div id="docs-topics" className="docs-topics">
                {docGroups.map((group) => (
                    <div key={group.title} className="docs-group">
                        <div className="docs-group-title">{group.title}</div>
                        <ul>
                            {(group.topics as readonly DocTopic[]).map(([id, label]) => (
                                <li key={id}>
                                    <a href={`#/docs/${id}`} aria-current={id === current ? "page" : undefined}>{label}</a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </nav>
    );
}

/** Previous and Next at the bottom of a page, so the topics can be read straight through. The last page leads on to the library. */
function PageLinks({ from }: { from: DocId }) {
    const i = docSections.findIndex(([id]) => id === from);
    const prev = docSections[i - 1];
    const next = docSections[i + 1];
    return (
        <div className="page-links">
            {prev ? (
                <p className="next-link prev-link">
                    <a href={`#/docs/${prev[0]}`}><span>Previous</span> ← {docTitle(prev[0])}</a>
                </p>
            ) : <span />}
            <p className="next-link">
                <a href={next ? `#/docs/${next[0]}` : "#/icons"}>
                    <span>{next ? "Next" : "Done reading?"}</span> {next ? docTitle(next[0]) : "Browse the library"} →
                </a>
            </p>
        </div>
    );
}
