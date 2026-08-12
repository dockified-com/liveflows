# LiveFlows Design Review

Date: 2026-08-11
Target: http://localhost:3000
Scope: Public landing page

## Summary

Design review found the public landing page rendering a mostly black first viewport
with a black empty product preview. That conflicted with the app UI direction in
`docs/scope/scope.md`: LiveFlows is a collaborative system-design app, so the first
screen should show a recognizable workspace/canvas surface.

Design score: C -> B
AI slop score: D -> B

## Finding 001

Impact: High
Category: Visual hierarchy / AI slop / Product signal

The first viewport used a purple-on-black marketing treatment and a placeholder
reading `[ Interactive Canvas Demo ]`. Users saw a dark empty box instead of the
actual product promise: collaborative architecture diagramming.

Fix status: verified
Commit: `f87d042 style(design): FINDING-001 - replace empty landing preview`
Files changed:
- `src/app/page.tsx`
- `src/app/page.test.tsx`

Evidence:
- Before: `screenshots/first-impression-domcontentloaded.png`
- After: `screenshots/final-after.png`

## Verification

- `pnpm test src/app/page.test.tsx`: passed, 1 test
- `pnpm lint src/app/page.tsx src/app/page.test.tsx`: passed
- Browser check: status 200, placeholder count 0, `API Gateway` present, no browser errors
- Remaining browser warning: Clerk development-key warning only

## PR Summary

Design review found 1 high-impact landing-page issue and fixed 1. Design score C -> B, AI slop score D -> B.
