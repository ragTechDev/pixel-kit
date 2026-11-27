// Core entry: pure TypeScript, no React, no DOM. It runs the same in a browser, a test or a server.
export { createLoop, type Loop, type LoopOptions, type LoopResult } from "./loop";
export { actions, createInput, directions, isAction, type Action, type Direction, type Input } from "./input";
export { cameraOrigin, createCamera, type Camera, type Size } from "./camera";
export { createWalker, isWalkable, neighbor, type Walker, type WalkerOptions, type WalkOptions, type WalkResult } from "./walker";
export { createMover, isOpen, overlaps, type Mover, type MoverOptions } from "./mover";
export { createCarry, type Carry, type CarryOptions, type CarryPhase, type CarryPose } from "./carry";
export { createPopups, type Anchor, type Popup, type PopupOptions, type Popups, type Rect } from "./popups";
export { createScenes, type Scene, type SceneStack } from "./scenes";
export { createGame, type Game, type GameOptions } from "./game";
