# Contributing

Thank you for helping improve Travel Handbook Template.

## Before You Start

- Keep the application usable without a backend or credentials.
- Use fictional trips and generic traveler names in examples and tests.
- Do not attach real trip exports, booking references, identity documents or credentials to issues and pull requests.
- Keep the MIT license and third-party notices in distributions.

## Development

Use Node.js 20+ and PowerShell 7. Install the pinned test dependency with `npm ci`.

If Chrome is available in the standard Windows location, the smoke test uses it. Otherwise run `npx playwright install chromium`. Set `CHROME_PATH` only when using another Chrome executable.

```sh
npm test
npm run build
```

The tests cover file opening, static HTTP hosting, forms, import validation, backup/restore, isolated trips, mobile layouts and PWA offline behavior. Screenshots are written to ignored `.test-artifacts/`.

## Changes

- Keep sample trip content in `trip.config.js`.
- Keep settings and progress in the existing validated local storage model.
- Add focused regression coverage for behavioral changes.
- Document external network requests and third-party service conditions.
- Run the checks before sending a pull request. CI performs the same checks without credentials or deployment.

Owners can provide additional privacy patterns via `PRIVATE_SCAN_RULES`, pointing to a private JSON file outside the repository. Do not commit those patterns if they identify a real person or trip.
