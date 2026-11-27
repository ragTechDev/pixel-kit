import { useEffect, useMemo, useRef } from "react";
import { defaultTileTheme, tileSeasons } from "@ragtechdev/pixel-sprites";
import gameSource from "../play/game.ts?raw";
import { createPlay, DESKTOP_VIEW, HANDHELD_VIEW, type Play } from "../play/game";
import { Handheld } from "../play/Handheld";
import { PlayCanvas } from "../play/PlayCanvas";
import { useHandheld, useMediaQuery, useWidth } from "../hooks";
import { href, setQuery, themeOf, type Route } from "../router";
import { Chips, CodeBlock } from "../ui";

const ENGINE = "https://github.com/ragTechDev/pixel-kit/tree/main/packages/pixel-engine";

/** Gives the world's characters new looks, and goes to the avatar studio to make one by hand. */
function Actions({ play, route }: { play: Play; route: Route }) {
    return (
        <div className="row">
            <button className="btn primary" onClick={() => play.randomize()}>Randomize avatars</button>
            <a className="btn" href={href(["avatars"], route)}>Make your own in the avatar studio</a>
        </div>
    );
}

function About() {
    return (
        <section id="how" className="panel stack">
            <h2>How it is made</h2>
            <p>
                The sprites package draws the map and the avatars and knows which tiles block. The engine runs the fixed-step loop, reads the keys, moves the hero a tile at a time, follows
                them with the camera, and switches scenes at a door. This is the whole world: no framework, no image files.
            </p>
            <details>
                <summary>Show the code</summary>
                <CodeBlock code={gameSource} />
            </details>
            <div className="row">
                <a className="btn" href={ENGINE}>Engine on GitHub ↗</a>
            </div>
        </section>
    );
}

export function PlayPage({ route }: { route: Route }) {
    const theme = themeOf(route);
    const handheld = useHandheld();
    // The page's current route, for the callback below: it runs long after the render that made it.
    const current = useRef(route);
    current.current = route;
    // Held upright, the phone's screen spans the page like the home page's demo: a whole-number zoom, and a view just wide
    // enough to fill the element's own width at it. On its side it is the handheld's 160 by 144 screen between the controls.
    const upright = !useMediaQuery("(orientation: landscape)");
    const [wrap, measured] = useWidth<HTMLDivElement>();
    const width = measured || document.documentElement.clientWidth;
    const span = handheld && upright;
    const scale = width <= 480 ? 2 : 3;
    const view = span ? { width: Math.min(Math.floor(width / scale), DESKTOP_VIEW.width), height: HANDHELD_VIEW.height } : handheld ? HANDHELD_VIEW : DESKTOP_VIEW;
    // Changing the view starts the world again.
    const play = useMemo(
        () => createPlay(
            { theme, onTheme: (next) => setQuery(current.current, { theme: next === defaultTileTheme ? undefined : next }) },
            view
        ),
        // The theme only seeds the first world; the line below keeps it in step afterwards.
        [view.width, view.height]
    );
    // The game reads this on every frame, so changing the season needs no restart.
    play.options.theme = theme;
    // #/play/code is a link straight to the code, for a phone where the demo on the home page is already the whole game.
    const toCode = route.path[1] === "code";
    useEffect(() => {
        if (!toCode) return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        document.getElementById("how")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    }, [toCode]);

    if (handheld) {
        return (
            <div className="stack" style={{ gap: 0 }} ref={wrap}>
                <Handheld play={play} exitHref={href([], route)} span={span ? scale : undefined} />
                <div className="gb-about">
                    <section className="panel stack"><Actions play={play} route={route} /></section>
                    <About />
                </div>
            </div>
        );
    }
    return (
        <div className="stack" style={{ gap: 24 }}>
            <section className="panel stack">
                <h1>Play</h1>
                <p>
                    A small world built from the sprites and the engine. Click it, then walk with the arrow keys or WASD
                    {" "}(or the pad on a touch screen). Step onto the door of the restaurant (the house) or the grocer (the brick shop) to go inside, and back out through the door at the bottom.
                </p>
                <PlayCanvas play={play} maxScale={3} autoFocus />
                <Actions play={play} route={route} />
                <Chips
                    label="Season"
                    value={theme}
                    options={tileSeasons}
                    nativeLabel={false}
                    onPick={(next) => next && setQuery(route, { theme: next === defaultTileTheme ? undefined : next })}
                />
                <p className="muted">
                    Keys: arrows or WASD walk, Z or Space is A (speak to the character in front, who turns to face you and gets a comment over their head, or a heart if you were holding something, which you give them, or pick a crop or a tree's fruit and hold it; A again puts it down), hold X for B (run), and Enter is START (change the season).
                    Water, trees, walls and the other characters stop you, because collision reads the same tile and object data that drew the map.
                </p>
                <p className="muted">On a phone this page becomes a handheld console, with a pad and A, B and START buttons on screen.</p>
            </section>
            <About />
        </div>
    );
}
