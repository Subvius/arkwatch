# ArkWatch

Windows 11 desktop screen-time tracker built with Electron + React + TypeScript.

## Features

- Per-app active time tracking (foreground app sampling every 1s)
- Idle detection (default 5 minutes)
- Local-only SQLite storage (`%APPDATA%/ArkWatch/arkwatch.db`)
- System tray controls (open, pause/resume, quit)
- Auto-start at login toggle
- Neo-brutalist dashboard using shadcn/ui + Merriweather font

## Tech Stack

- Electron + electron-vite
- React + TypeScript + Tailwind + shadcn-style UI primitives
- SQLite (`sqlite` + `sqlite3`)
- Vitest for unit/integration tests

## Development

```powershell
bun install
bun run dev
```

## Quality Checks

```powershell
bun run typecheck
bun run test
bun audit
```

## Build

```powershell
bun run build
```

## Windows Installer (NSIS)

```powershell
bun run dist
```

Unsigned installer output:

- `release/0.1.0/ArkWatch-0.1.0-setup.exe`

## Notes

- The project is configured for local unsigned builds (`signAndEditExecutable: false`) while keeping a signed-ready electron-builder pipeline.
- To enable code signing for production, provide standard Electron Builder signing environment variables (for example `CSC_LINK` and `CSC_KEY_PASSWORD`) and adjust signing options as needed.
