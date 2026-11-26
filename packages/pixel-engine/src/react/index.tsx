import { useEffect, useRef, useState } from "react";
import type { Action, Game } from "../index";
import { attachKeyboard, defaultKeymap, start } from "../dom";

/** Creates a game once for the life of the component and keeps it across renders. */
export function useGame<Ctx = CanvasRenderingContext2D>(create: () => Game<Ctx>): Game<Ctx> {
    return useState(create)[0];
}

export interface GameViewProps {
    readonly game: Game<CanvasRenderingContext2D>;
    /** Size of the picture in game pixels. */
    readonly width: number;
    readonly height: number;
    /** Whole-number zoom. Default 3. */
    readonly scale?: number;
    /**
     * Where key presses are read. `canvas` (the default) needs focus, so a page with forms keeps its keys;
     * `window` listens everywhere.
     */
    readonly keyboard?: "canvas" | "window";
    readonly keymap?: Readonly<Record<string, Action>>;
    /** Focuses the canvas when it mounts. */
    readonly autoFocus?: boolean;
    readonly className?: string;
    /** Describes the game for screen readers. */
    readonly title?: string;
}

/** Mounts a game on a canvas and runs it until the component unmounts. */
export function GameView({ game, width, height, scale = 3, keyboard = "canvas", keymap = defaultKeymap, autoFocus = false, className, title }: GameViewProps) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const stop = start(game, canvas, { width, height, scale });
        const detach = attachKeyboard(keyboard === "window" ? window : canvas, game.input, keymap);
        return () => {
            stop();
            detach();
        };
    }, [game, width, height, scale, keyboard, keymap]);
    useEffect(() => {
        if (autoFocus) ref.current?.focus();
    }, [autoFocus]);
    return (
        <canvas
            ref={ref}
            width={width}
            height={height}
            tabIndex={0}
            role="img"
            aria-label={title}
            className={className}
            style={{ width: width * scale, height: height * scale, imageRendering: "pixelated" }}
        />
    );
}
