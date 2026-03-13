# Release Guide

1. Bump version in `package.json`.
2. Commit and tag:
   - `git add package.json`
   - `git commit -m "chore: bump version to X.Y.Z"`
   - `git tag -a vX.Y.Z -m "vX.Y.Z"`
3. Push branch and tag:
   - `git push origin <branch>`
   - `git push origin vX.Y.Z`
4. Wait for GitHub Actions workflow `Release Windows Installer` to finish.
5. Verify release assets for that tag include:
   - `ArkWatch-X.Y.Z-setup.exe`
   - `latest.yml`
   - `ArkWatch-X.Y.Z-setup.exe.blockmap` (or equivalent blockmap)

## Important

- Do not publish by manually uploading only `.exe` to GitHub Releases.
- Auto-update requires metadata files (`latest.yml` + blockmap).

## Manual fallback (local publish)

If CI is unavailable:

```powershell
$env:GH_TOKEN = "<github-token-with-repo-write-access>"
bun run dist:publish
```

Then verify the same 3 assets are present in the release.

# Commands

- Install deps: `bun install`
- Dev: `bun run dev`
- Build: `bun run build`
- Typecheck: `bun run typecheck`
- Test: `bun run test`
- Dist (build + installer): `bun run dist`
- Dist + publish: `bun run dist:publish`
