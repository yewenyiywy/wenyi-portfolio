# Wenyi Ye — Personal Portfolio

Next.js + TypeScript + Tailwind portfolio site.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Latest update

- Added an editorial Hobbies section with Wenyi's embroidery and game-modding work.
- Added color-graded embroidery photo.
- Added two hand-drawn character mod images for Sultan's Game.
- Linked Sultan's Game to its Steam store page.

## Mobile layout check

Every pull request runs `.github/workflows/mobile-layout.yml`: it builds the site and opens each page at phone widths (360px Android, iPhone SE, iPhone 15, in both the Chrome and Safari engines). The check fails if the page scrolls sideways, if any text runs past the screen edge or is cut off by its box, or if an image is wider than the screen. The failure message names the element and how many pixels it overflows; full-page screenshots are in the run's `mobile-layout-report` artifact.

Run it locally:

```bash
npm run build
npx playwright install chromium webkit   # first time only
npm run test:mobile
```

Decorative pieces that are meant to bleed off the edge should have `aria-hidden="true"`, or `data-allow-overflow` on the element.
