import { useMemo, useRef, type ReactNode } from "react";
import { Avatar, Icon, Tile, World, WorldObject } from "@ragtechdev/pixel-sprites/react";
import { buildMap, buildTile, defaultTileTheme, iconIds, objectIds, tileIds, toSvgDataUrl } from "@ragtechdev/pixel-sprites";
import { createPlay, DESKTOP_VIEW } from "../play/game";
import { ConsoleDeck } from "../play/Handheld";
import { PlayCanvas } from "../play/PlayCanvas";
import { useMediaQuery, useWidth } from "../hooks";
import { href, setQuery, themeOf, type Route } from "../router";
import { CodeBlock } from "../ui";
import { miniTown } from "../worlds";

const cards = [
    { to: "icons", title: "Icons", count: iconIds.length, text: "Shaded, coloured icons in lucide-style categories." },
    { to: "tiles", title: "Tiles", count: tileIds.length, text: "Terrain and nine-patch edges, with palettes." },
    { to: "objects", title: "Objects", count: objectIds.length, text: "Trees, doors and furniture, with footprints." },
    { to: "avatars", title: "Avatars", count: undefined, text: "Mix hair, skin, clothes and poses." },
    { to: "worlds", title: "Worlds", count: undefined, text: "Whole maps, recoloured by palette." },
    { to: "docs", title: "Docs", count: undefined, text: "Install, use in React, CSS or canvas." }
] as const;

/** One way to use the art on an ordinary page: a live preview, built by exactly the code beside it. */
function Example({ title, text, preview, code }: { title: string; text: string; preview: ReactNode; code: string }) {
    return (
        <div className="panel example">
            <div className="h">{title}</div>
            <p className="muted">{text}</p>
            <div className="example-preview">{preview}</div>
            <CodeBlock code={code} />
        </div>
    );
}

const grassUrl = toSvgDataUrl(buildTile("grass"), 4);
const townUrl = toSvgDataUrl(buildMap(miniTown, "autumn"), 2);

const engineSketch = `import { createGame, createWalker, isWalkable } from "@ragtechdev/pixel-engine";
import { attachKeyboard, start } from "@ragtechdev/pixel-engine/dom";

const hero = createWalker({ x: 1, y: 0 });
const game = createGame({
    scene: (game) => ({
        update(dt) {
            const direction = game.input.heldDirection();
            if (direction) hero.walk(direction, (x, y) => isWalkable(map, x, y)); // map: from defineMap
            hero.update(dt);
        },
        render(ctx) { /* draw the map and the avatar */ }
    })
});
attachKeyboard(canvas, game.input);
start(game, canvas, { width: 240, height: 144, scale: 3 });`;

export function HomePage({ route }: { route: Route }) {
    const theme = themeOf(route);
    const mobile = useMediaQuery("(max-width: 720px)");
    // On its side a phone is too short for the screen and the controls together, so the Play page's console, which puts them side by side, is the better place to play.
    const sideways = useMediaQuery("(max-width: 720px) and (orientation: landscape)");
    // The demo's own width, not the window's: it changes when a scrollbar appears, and the window's size does not.
    const [demo, measured] = useWidth<HTMLDivElement>();
    const width = measured || document.documentElement.clientWidth;
    // On a phone the world spans the screen. The zoom is a whole number that keeps the view inside the map (at most 240 px
    // wide), and the view is just wide enough to fill the width at that zoom. Sideways it is a 2x screen that fits the height.
    // Turning the phone makes a new world.
    const scale = sideways || width <= 480 ? 2 : 3;
    const view = mobile ? { width: Math.min(Math.floor(width / scale), DESKTOP_VIEW.width), height: DESKTOP_VIEW.height } : DESKTOP_VIEW;
    // START changes the season from inside the world. The address holds it, like the season chips on the Play page, so tell the page;
    // otherwise the next render would put the old season back. The route is read through a ref because the callback outlives this render.
    const current = useRef(route);
    current.current = route;
    // The theme only seeds the first world; the line below keeps it in step afterwards.
    const play = useMemo(
        () => createPlay({ theme, onTheme: (next) => setQuery(current.current, { theme: next === defaultTileTheme ? undefined : next }) }, view),
        [view.width]
    );
    play.options.theme = theme;
    const toAssets = () => {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        document.getElementById("assets")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    };
    return (
        <div className="stack" style={{ gap: 24 }}>
            <section className="panel hero">
                <div className="hero-text stack">
                    <h1>Pixel characters for your pages, and a tiny engine to play with</h1>
                    <p>
                        Avatars, tiles, objects and icons you can drop into any web page as React components, SVG, CSS or canvas. Add the engine, and the same art walks around a world.
                    </p>
                    <div className="row">
                        <button className="btn primary" onClick={toAssets}>Use it as assets</button>
                        <a className="btn" href={href(["play"], route)}>Make a game</a>
                    </div>
                    <p className="muted">Built from fixed masks and fixed palettes, so it stays small and consistent. Code MIT, art CC BY 4.0.</p>
                </div>
                <div className="hero-play" ref={demo}>
                    <PlayCanvas play={play} maxScale={3} scale={mobile ? scale : undefined} fill={mobile} pad={!mobile} />
                    {mobile && !sideways && <ConsoleDeck input={play.game.input} />}
                    <div className="hero-play-foot">
                        {!mobile && <p className="muted">Click the world, then walk with the arrow keys or WASD. Try the door.</p>}
                        {/* Upright, the demo above is already the whole game, so the Play page only adds the code. */}
                        {mobile && !sideways && <a className="btn" href={href(["play", "code"], route)}>See the code</a>}
                        {sideways && <a className="btn primary" href={href(["play"], route)}>Play full screen</a>}
                        {!mobile && <a className="btn primary" href={href(["play"], route)}>Open the Play page</a>}
                    </div>
                </div>
            </section>

            <section id="assets" className="stack">
                <div className="stack" style={{ gap: 6 }}>
                    <h2>Use it as assets</h2>
                    <p>Every piece is a small image you can place anywhere. No game required, and nothing to download but the package.</p>
                </div>
                <div className="examples">
                    <Example
                        title="A character on your profile card"
                        text="Pick hair, skin and clothes from the fixed options."
                        preview={
                            <div className="profile">
                                <Avatar skinTone="brown" hairColor="black" topStyle="top" sleeveLength="long" clothesColor="red" backHairStyle="highPigtails" pixelSize={4} />
                                <div>
                                    <strong>Mina</strong>
                                    <div className="muted">Gardener, level 4</div>
                                </div>
                            </div>
                        }
                        code={`import { Avatar } from "@ragtechdev/pixel-sprites/react";

<Avatar skinTone="brown" hairColor="black" topStyle="top" sleeveLength="long"
        clothesColor="red" backHairStyle="highPigtails" pixelSize={4} />`}
                    />
                    <Example
                        title="Icons in your buttons and menus"
                        text="Shaded, coloured icons that scale in whole pixels."
                        preview={
                            <div className="row">
                                <button className="btn"><Icon id="heart" pixelSize={2} /> Like</button>
                                <button className="btn"><Icon id="save" pixelSize={2} /> Save</button>
                            </div>
                        }
                        code={`import { Icon } from "@ragtechdev/pixel-sprites/react";

<button><Icon id="heart" pixelSize={2} /> Like</button>
<button><Icon id="save" pixelSize={2} /> Save</button>`}
                    />
                    <Example
                        title="A tile as a page background"
                        text="Plain CSS: a data URL, tiled and kept sharp."
                        preview={<div className="tile-bg" style={{ backgroundImage: `url("${grassUrl}")` }} />}
                        code={`import { buildTile, toSvgDataUrl } from "@ragtechdev/pixel-sprites";

el.style.backgroundImage = \`url("\${toSvgDataUrl(buildTile("grass"), 4)}")\`;
el.style.imageRendering = "pixelated";`}
                    />
                    <Example
                        title="A whole scene as one image"
                        text="Build a map once, in any season, and use it like a picture."
                        preview={<img className="scene-img" src={townUrl} alt="A small autumn town: a house, a tree and some flowers" />}
                        code={`import { buildMap, toSvgDataUrl } from "@ragtechdev/pixel-sprites";

img.src = toSvgDataUrl(buildMap(map, "autumn"), 2); // map: from defineMap`}
                    />
                </div>
                <div className="row">
                    <a className="btn" href={href(["docs", "start"], route)}>Read the docs</a>
                    <a className="btn" href={href(["docs", "outside-react"], route)}>CSS, SVG and canvas</a>
                </div>
            </section>

            <section className="panel stack">
                <h2>Or make a lightweight game</h2>
                <p>
                    The engine adds what a tile-based game needs and nothing else: a fixed-step loop, keys, a camera, movement a tile at a time, doors and scenes. Collision comes from the same map data that drew the world.
                    It has no framework dependency and a couple of kilobytes of code, with a React component if you want one.
                </p>
                <p>Start your own with one command. It writes a small project with a town and a door to walk through, ready to run and change:</p>
                <CodeBlock code="npm create @ragtechdev/pixel-game my-game" />
                <p>Or add the engine to a project you already have:</p>
                <CodeBlock code={engineSketch} />
                <div className="row">
                    <a className="btn primary" href={href(["play"], route)}>Open the playground</a>
                    <a className="btn" href="https://github.com/ragTechDev/pixel-kit/tree/main/packages/pixel-engine">Engine on GitHub ↗</a>
                </div>
            </section>

            <section className="stack">
                <h2>Browse the library</h2>
                <div className="cards">
                    {cards.map((c) => (
                        <a key={c.to} className="panel card" href={href([c.to], route)}>
                            <div className="strip" aria-hidden>
                                {c.to === "icons" && (["heart", "cottage", "quill", "mailbox"] as const).map((id) => <Icon key={id} id={id} pixelSize={3} />)}
                                {c.to === "tiles" && (["grass", "water", "path", "roof"] as const).map((id) => <Tile key={id} id={id} pixelSize={3} />)}
                                {c.to === "objects" && (["tree", "door", "bookshelf", "flower"] as const).map((id) => <WorldObject key={id} id={id} pixelSize={2} />)}
                                {c.to === "avatars" && <Avatar pixelSize={2} skinTone="medium" hairColor="black" />}
                                {c.to === "worlds" && <World map={miniTown} pixelSize={1} />}
                                {c.to === "docs" && <Icon id="notice_board" pixelSize={3} />}
                            </div>
                            <div className="h">{c.title}{c.count ? ` (${c.count})` : ""}</div>
                            <p className="muted">{c.text}</p>
                        </a>
                    ))}
                </div>
            </section>
        </div>
    );
}
