import { defineConfig, devices } from '@playwright/test'

/*
 * Mobile layout checks. Runs the production build locally and loads each page
 * at common phone widths. See tests/mobile-layout.spec.ts.
 *
 * Locally: npm run build && npm run test:mobile
 * CHROME_PATH=/path/to/chrome uses an installed Chrome instead of Playwright's.
 */

const chromeLaunch = process.env.CHROME_PATH ? { launchOptions: { executablePath: process.env.CHROME_PATH } } : {}
const onlyChromium = Boolean(process.env.CHROME_PATH)

const phones = [
  // Smallest phone still in common use; catches most overflow first.
  { name: 'android-360', use: { ...devices['Galaxy S9+'], viewport: { width: 360, height: 740 }, ...chromeLaunch } },
  { name: 'iphone-se-375', use: { ...devices['iPhone SE'], ...(onlyChromium ? { defaultBrowserType: 'chromium' as const, ...chromeLaunch } : {}) } },
  { name: 'iphone-15-393', use: { ...devices['iPhone 15'], ...(onlyChromium ? { defaultBrowserType: 'chromium' as const, ...chromeLaunch } : {}) } },
]

export default defineConfig({
  testDir: './tests',
  testIgnore: 'studio-render.spec.ts',
  fullyParallel: true,
  timeout: 90_000,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:3000',
    reducedMotion: 'reduce',
  },
  projects: phones,
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
