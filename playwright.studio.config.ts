import { defineConfig } from '@playwright/test'

// Dedicated production-render regression: WebGL must actually initialize.
export default defineConfig({
  testDir:'./tests',testMatch:'studio-render.spec.ts',workers:1,
  timeout:180_000,retries:0,reporter:'list',outputDir:'test-results/studio',
  use:{baseURL:'http://localhost:3000',browserName:'chromium',viewport:{width:960,height:640},deviceScaleFactor:1,
    launchOptions:{...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']},
  },
  webServer:{command:'npm run start',url:'http://localhost:3000',reuseExistingServer:!process.env.CI,timeout:60_000},
})
