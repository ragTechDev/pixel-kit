import { useState } from "react";
import { defaultTileTheme, tileThemes } from "@ragtechdev/pixel-sprites";
import gameSource from "../play/game.ts?raw";
import { createPlay } from "../play/game";
import { PlayCanvas } from "../play/PlayCanvas";
import { setQuery, themeOf, type Route } from "../router";
import { Chips, CodeBlock } from "../ui";

const ENGINE = "https://github.com/ragTechDev/pixel-kit/tree/main/packages/pixel-engine";

export function PlayPage({ route }: { route: Route }) {
    const theme = themeOf(route);
    const [play] = useState(() => createPlay({ theme }));
    // The game reads this on every frame, so changing the season needs no restart.
    play.options.theme = theme;
    return (
        <div className="stack" style={{ gap: 24 }}>
            <section className="panel stack">
                <h1>Play</h1>
                <p>
                    A small world built from the sprites and the engine. Click it, then walk with the arrow keys or WASD
                    {" "}(or the pad on a touch screen). Step onto the house door to go inside, and back out through the door at the bottom.
                </p>
                <PlayCanvas play={play} maxScale={3} autoFocus />
                <Chips
                    label="Season"
                    value={theme}
                    options={tileThemes}
                    nativeLabel={false}
                    onPick={(next) => next && setQuery(route, { theme: next === defaultTileTheme ? undefined : next })}
                />
                <p className="muted">
                    Water, trees, walls and the other characters stop you, because collision reads the same tile and object data that drew the map.
                    The season recolours the whole world from one fixed palette.
                </p>
            </section>
            <section className="panel stack">
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
        </div>
    );
}
