import type { PointerEvent } from "react";
import { GameView } from "@ragtechdev/pixel-engine/react";
import type { Direction, Input } from "@ragtechdev/pixel-engine";
import { useInView, useMediaQuery, useWidth } from "../hooks";
import type { Play } from "./game";

const pad: ReadonlyArray<{ direction: Direction; label: string; glyph: string }> = [
    { direction: "up", label: "Up", glyph: "▲" },
    { direction: "left", label: "Left", glyph: "◀" },
    { direction: "right", label: "Right", glyph: "▶" },
    { direction: "down", label: "Down", glyph: "▼" }
];

/**
 * Captures the pointer so the release still arrives if a finger slides off the control. Some pointers cannot be
 * captured (a synthetic one, a pointer that has just ended), and that must not stop the press.
 */
export function capture(event: PointerEvent<HTMLElement>) {
    try {
        event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
        // The press still counts; only the slide-off release is lost.
    }
}

/** An on-screen direction pad for touch screens. It presses the same actions as the keys. */
function DPad({ input }: { input: Input }) {
    const press = (direction: Direction) => (event: PointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        capture(event);
        input.press(direction);
    };
    const release = (direction: Direction) => () => input.release(direction);
    return (
        <div className="dpad" role="group" aria-label="Walk">
            {pad.map(({ direction, label, glyph }) => (
                <button
                    key={direction}
                    className={`dpad-${direction}`}
                    aria-label={label}
                    onPointerDown={press(direction)}
                    onPointerUp={release(direction)}
                    onPointerCancel={release(direction)}
                    onContextMenu={(event) => event.preventDefault()}
                >
                    {glyph}
                </button>
            ))}
        </div>
    );
}

/**
 * The demo world on a canvas, as large a whole-number zoom as fits. It runs only while it is on screen,
 * and takes keys only while it has focus, so it never traps scrolling or the keys of a form.
 */
export function PlayCanvas({ play, maxScale = 4, autoFocus = false, scale: fixed, pad = true }: {
    play: Play;
    maxScale?: number;
    autoFocus?: boolean;
    /** A whole-number zoom to use as it is, for a layout that has already worked out what fits. */
    scale?: number;
    /** Show the simple on-screen pad on touch screens. A layout with its own controls turns this off. */
    pad?: boolean;
}) {
    const { view } = play;
    const [sized, width] = useWidth<HTMLDivElement>();
    const [watched, visible] = useInView<HTMLDivElement>();
    const touch = useMediaQuery("(pointer: coarse)");
    const scale = fixed ?? Math.max(1, Math.min(maxScale, Math.floor(width / view.width)));
    return (
        <div className="play" ref={sized}>
            <div className="play-screen" ref={watched} style={{ width: view.width * scale, height: view.height * scale }}>
                {(fixed !== undefined || width > 0) && visible && (
                    <GameView
                        game={play.game}
                        width={view.width}
                        height={view.height}
                        scale={scale}
                        autoFocus={autoFocus}
                        className="play-canvas"
                        title="A small town to walk around. Click it, then use the arrow keys or WASD. Walk into the house door to go inside."
                    />
                )}
            </div>
            {pad && touch && <DPad input={play.game.input} />}
        </div>
    );
}
