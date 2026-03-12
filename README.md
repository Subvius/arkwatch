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

## Auto Updates

ArkWatch now uses Electron's auto-updater in packaged builds.

- Checks for updates 15 seconds after startup, then every 6 hours
- Downloads updates automatically in the background
- Shows live download progress in the dashboard
- Prompts the user to restart when the update is ready
- Installs automatically on quit if the user chooses "Later"

Updates are pulled from GitHub Releases (`Subvius/arkwatch`) via `electron-builder` publish config.

### Publish an update

```powershell
$env:GH_TOKEN = "<github-token-with-repo-access>"
bun run dist:publish
```

This uploads installer/update metadata (`latest.yml`, blockmap, setup `.exe`) so existing installs can auto-update.

## Notes

- The project keeps signing optional for local builds (`signAndEditExecutable: false`). Windows EXE metadata/icon branding is applied in `build/after-pack.cjs` via `rcedit`, so ArkWatch appears correctly in Task Manager and shell surfaces.
- To enable code signing for production, provide standard Electron Builder signing environment variables (for example `CSC_LINK` and `CSC_KEY_PASSWORD`) and adjust signing options as needed.

