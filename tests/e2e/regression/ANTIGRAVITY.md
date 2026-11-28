# Regression hand-off (for Antigravity or any agent on a laptop)

Run the browser regression suites and report failures. Do not change app code.

```
git pull
npm ci
npm i --no-save playwright && npx playwright install chromium
npm run build
npx vite preview --port 4173 &
node tests/e2e/regression/run.cjs
```

Report back: the last 15 lines of output, and for each failing suite the `FAIL` lines.
Suites assume the dev auth bypass used by the preview build (sign-in with any email).
Screenshots go to `tests/e2e/regression/out/` (not committed).
