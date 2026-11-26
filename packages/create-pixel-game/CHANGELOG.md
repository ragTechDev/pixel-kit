# Changelog

All notable changes to this package are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org/). Before 1.0, a breaking change bumps the
minor version.

To draft the next entry from the commit history, run `pnpm changelog create-pixel-game`. See
"Releases" in CLAUDE.md for the full flow.

<!-- next-release -->

## [0.1.0] - 2026-11-26

First release: `npm create @ragtechdev/pixel-game my-game` starts a pixel-art game on ragTech Pixel Kit. It has no dependencies and needs Node 20 or newer.

### Added
- **The command.** Give it a name (or a path, or `.` for an empty current folder) or leave it off and it asks. It writes the starter and prints what to run next. It never installs anything or runs a command for you, never overwrites a file, and refuses a folder that already has something in it.
- **The starter**, a [Vite](https://vite.dev) and TypeScript project on `@ragtechdev/pixel-sprites` (`^0.9.0`) and `@ragtechdev/pixel-engine` (`^0.1.0`): a small town and a house you can walk into, with a hero, a camera and a door between them. It type-checks and builds as it comes, to about 19 KB gzipped.
- **The kit's supply-chain settings** in the new project's `pnpm-workspace.yaml`: no install scripts, a three-day delay on brand-new versions with an exception for the `@ragtechdev` packages (so a fresh kit release installs), and a trust check. A commented-out block shows how to point at a local checkout of the kit.
- **An agent guide.** The project's `CLAUDE.md` says how it is set up, what belongs in the game and what belongs in the kit, and the rules to keep. Fill in its first section about your game.
