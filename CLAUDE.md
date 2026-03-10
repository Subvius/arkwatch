# Release Guide

1. Bump version in `package.json`
2. Commit: `git add package.json && git commit -m "chore: bump version to X.Y.Z"`
3. Tag: `git tag -a vX.Y.Z -m "vX.Y.Z - description"`
4. Push: `git push origin <branch> && git push origin vX.Y.Z`
5. Build installer: `bun run dist`
6. Create GitHub release: `gh release create vX.Y.Z "release/X.Y.Z/ArkWatch-X.Y.Z-setup.exe" --title "vX.Y.Z" --notes "changelog"`

# Commands

- Dev: `bun run dev`
- Build: `bun run build`
- Typecheck: `bun run typecheck`
- Test: `bun run test`
- Dist (build + installer): `bun run dist`
