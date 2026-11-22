# Crewww storefront

React storefront prototype adapted to the Crewww hoodie references in `docs/material/`. The hero is an original procedural Three.js fashion district with working collection entrances and an accessible 2D path. Prices, variants, stock and specifications remain demo values. The hoodie inspection model is an illustrative procedural model, not a production garment asset. The existing `main.py` is not part of the frontend.

## Run locally

Requires Node.js 20.19+ and npm. If Node is not on `PATH`, this environment's portable Node LTS can be added to the current PowerShell session:

```powershell
$nodeDir = Join-Path $env:LOCALAPPDATA 'Programs\node-portable-26.13.1\node-v26.13.1-win-x64'
$env:PATH = "$nodeDir;$env:PATH"
```

```powershell
npm install
npm run dev
```

The current routes are `/` (Crewww hoodie showroom), `/concept` (earlier foundation concept) and `/design-system`.

## Verification

```powershell
npm run typecheck
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

See `docs/showroom-architecture.md`, `docs/showroom-qa.md`, and `docs/milestones.md` for implementation, QA, limitations and remaining homepage scope.
