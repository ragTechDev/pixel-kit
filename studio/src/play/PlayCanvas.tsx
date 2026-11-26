import type { PointerEvent } from "react";
import { GameView } from "@ragtechdev/pixel-engine/react";
import type { Direction, Input } from "@ragtechdev/pixel-engine";
import { useInView, useMediaQuery, useWidth } from "../hooks";
import { VIEW, type Play } from "./game";

const pad: ReadonlyArray<{ direction: Direction; label: string; glyph: string }> = [
    { direction: "up", label: "Up", glyph: "▲" },
    { direction: "left", label: "Left", glyph: "◀" },
    { direction: "right", label: "Right", glyph: "▶" },
    { direction: "down", label: "Down", glyph: "▼" }
];

/** An on-screen direction pad for touch screens. It presses the same actions as the keys. */
function DPad({ input }: { input: Input }) {
    const press = (direction: Direction) => (event: PointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        // Capturing the pointer means the release still arrives if a finger slides off the button.
        event.currentTarget.setPointerCapture(event.pointerId);
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
export function PlayCanvas({ play, maxScale = 4, autoFocus = false }: { play: Play; maxScale?: number; autoFocus?: boolean }) {
    const [sized, width] = useWidth<HTMLDivElement>();
    const [watched, visible] = useInView<HTMLDivElement>();
    const touch = useMediaQuery("(pointer: coarse)");
    const scale = Math.max(1, Math.min(maxScale, Math.floor(width / VIEW.width)));
    return (
        <div className="play" ref={sized}>
            <div className="play-screen" ref={watched} style={{ width: VIEW.width * scale, height: VIEW.height * scale }}>
                {width > 0 && visible && (
                    <GameView
                        game={play.game}
                        width={VIEW.width}
                        height={VIEW.height}
                        scale={scale}
                        autoFocus={autoFocus}
                        className="play-canvas"
                        title="A small town to walk around. Click it, then use the arrow keys or WASD. Walk into the house door to go inside."
                    />
                )}
            </div>
            {touch && <DPad input={play.game.input} />}
        </div>
    );
}
