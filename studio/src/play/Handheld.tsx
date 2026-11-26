import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Action, Direction, Input } from "@ragtechdev/pixel-engine";
import { useMediaQuery, useViewport } from "../hooks";
import type { Play } from "./game";
import { capture, PlayCanvas } from "./PlayCanvas";

/** Within this fraction of the pad's width from its middle, a touch is on no arm. */
const DEAD_ZONE = 0.12;

const glyph: Record<Direction, string> = { up: "▲", down: "▼", left: "◀", right: "▶" };

/** One four-way pad. A thumb can slide from arm to arm without lifting, as on a handheld. */
function Cross({ input }: { input: Input }) {
    const box = useRef<HTMLDivElement>(null);
    const held = useRef<Direction | undefined>(undefined);
    const touching = useRef(false);
    const [lit, setLit] = useState<Direction>();
    const set = (next: Direction | undefined) => {
        if (held.current === next) return;
        if (held.current) input.release(held.current);
        if (next) input.press(next);
        held.current = next;
        setLit(next);
    };
    const read = (event: PointerEvent<HTMLDivElement>): Direction | undefined => {
        const rect = box.current!.getBoundingClientRect();
        const x = event.clientX - (rect.left + rect.width / 2);
        const y = event.clientY - (rect.top + rect.height / 2);
        if (Math.hypot(x, y) < rect.width * DEAD_ZONE) return undefined;
        return Math.abs(x) > Math.abs(y) ? (x < 0 ? "left" : "right") : y < 0 ? "up" : "down";
    };
    const end = () => {
        touching.current = false;
        set(undefined);
    };
    // Leaving the page with a finger on the pad must not leave a direction held.
    useEffect(() => () => {
        if (held.current) input.release(held.current);
    }, [input]);
    return (
        <div
            ref={box}
            className="gb-cross"
            role="group"
            aria-label="Directional pad"
            onPointerDown={(event) => {
                event.preventDefault();
                capture(event);
                touching.current = true;
                set(read(event));
            }}
            onPointerMove={(event) => {
                if (touching.current) set(read(event));
            }}
            onPointerUp={end}
            onPointerCancel={end}
            onContextMenu={(event) => event.preventDefault()}
        >
            {(Object.keys(glyph) as Direction[]).map((direction) => (
                <span key={direction} className={`gb-arm gb-arm-${direction}`} data-lit={lit === direction || undefined} aria-hidden>
                    {glyph[direction]}
                </span>
            ))}
        </div>
    );
}

/** A button that holds an action while it is pressed. Space and Enter work too, for a keyboard user who tabs to it. */
function Key({ input, action, className, label, caption }: { input: Input; action: Action; className: string; label: string; caption: string }) {
    const [down, setDown] = useState(false);
    const press = () => {
        input.press(action);
        setDown(true);
    };
    const release = () => {
        input.release(action);
        setDown(false);
    };
    const isActivate = (event: KeyboardEvent) => event.key === " " || event.key === "Enter";
    return (
        <div className="gb-key-wrap">
            <button
                className={`gb-key ${className}`}
                aria-label={label}
                data-down={down || undefined}
                onPointerDown={(event) => {
                    event.preventDefault();
                    capture(event);
                    press();
                }}
                onPointerUp={release}
                onPointerCancel={release}
                onKeyDown={(event) => {
                    if (isActivate(event) && !event.repeat) {
                        event.preventDefault();
                        press();
                    }
                }}
                onKeyUp={(event) => {
                    if (isActivate(event)) release();
                }}
                onContextMenu={(event) => event.preventDefault()}
            />
            <span className="gb-caption" aria-hidden>{caption}</span>
        </div>
    );
}

/**
 * The world as a handheld console, for a phone: the screen in a bezel, a cross pad under the left thumb, A and B under
 * the right, and START in the middle. Held upright the screen is on top; on its side the pad and buttons move to the
 * sides. The picture stays at a whole-number zoom, so every game pixel is the same size.
 */
export function Handheld({ play, exitHref }: { play: Play; exitHref: string }) {
    const { width, height } = useViewport();
    const landscape = useMediaQuery("(orientation: landscape)");
    const { view } = play;
    // Upright: the width less the shell and bezel. On its side the pad and the buttons take 316 px of the width
    // (shell, bezel, a 132 px pad, 130 px of buttons and the gaps) and the screen, its bezel and the shell take 40 px of the height.
    const fit = landscape
        ? Math.min(Math.floor((width - 316) / view.width), Math.floor((height - 40) / view.height))
        : Math.floor((width - 36) / view.width);
    const scale = Math.max(1, Math.min(3, fit));
    const input = play.game.input;
    return (
        <div className="gb">
            <div className="gb-top">
                <a className="gb-exit" href={exitHref}>◂ Exit</a>
            </div>
            <div className="gb-bezel">
                <span className="gb-led" aria-hidden />
                <PlayCanvas play={play} scale={scale} pad={false} />
                <span className="gb-label" aria-hidden>ragTech Pixel Kit</span>
            </div>
            <Cross input={input} />
            <div className="gb-center">
                <Key input={input} action="start" className="gb-pill" label="Start: change the season" caption="Start" />
            </div>
            <div className="gb-buttons">
                <Key input={input} action="b" className="gb-round" label="B: hold to run" caption="B" />
                <Key input={input} action="a" className="gb-round" label="A: speak to the character in front" caption="A" />
            </div>
            <p className="gb-hint">A speak · B hold to run · Start season</p>
            <div className="gb-speaker" aria-hidden>
                <span /><span /><span />
            </div>
        </div>
    );
}
