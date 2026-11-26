// Core entry: pure TypeScript, no React, no DOM. It runs the same in a browser, a test or a server.
export { createLoop, type Loop, type LoopOptions, type LoopResult } from "./loop";
export { actions, createInput, directions, isAction, type Action, type Direction, type Input } from "./input";
export { cameraOrigin, createCamera, type Camera, type Size } from "./camera";
export { createWalker, isWalkable, neighbor, type Walker, type WalkerOptions, type WalkOptions, type WalkResult } from "./walker";
export { createScenes, type Scene, type SceneStack } from "./scenes";
export { createGame, type Game, type GameOptions } from "./game";
