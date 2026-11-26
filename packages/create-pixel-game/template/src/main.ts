import { attachKeyboard, start } from "@ragtechdev/pixel-engine/dom";
import { createWorld, VIEW } from "./game";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("index.html has no #game canvas");

const game = createWorld();

// A canvas takes keys only while it has focus, so the page's other controls keep theirs.
canvas.tabIndex = 0;
canvas.focus();
attachKeyboard(canvas, game.input);

// Zoom in whole numbers so every game pixel is the same size, as large as fits the window.
const scale = Math.max(1, Math.min(4, Math.floor(window.innerWidth / VIEW.width)));
start(game, canvas, { width: VIEW.width, height: VIEW.height, scale });
