# Project delivery rules

- Keep trip-specific content in `trip.config.js`; do not hard-code private trip data in application files or tests.
- Never commit `wrangler.toml`, `.dev.vars`, exported progress, database backups, credentials, booking references, QR codes, or identity documents.
- Run `node tests/sensitive-scan.cjs`, syntax checks, `tests/smoke.cjs`, and `build.ps1` before pushing.
- Commit only in-scope source changes. Deployment is optional and must use the owner's explicitly chosen Cloudflare Pages project and a separate D1 database for the trip.
