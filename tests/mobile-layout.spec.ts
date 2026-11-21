import { test, expect, type Page } from '@playwright/test'

/*
 * Fails when anything readable spills past the phone screen:
 *   - the page scrolls sideways
 *   - a line of text runs past the screen edge, or is cut off by its container
 *   - an image or other media is wider than the screen
 *
 * Purely decorative pieces should carry aria-hidden="true". To let one element
 * overflow on purpose, add data-allow-overflow to it.
 *
 * A viewport screenshot of each state is attached to the test; all page
 * content, including off-screen elements, is still checked for overflow.
 */

type Problem = { kind: string; where: string; text: string; px: number }

async function findOverflow(page: Page): Promise<Problem[]> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const TOL = 1
    const problems: { kind: string; where: string; text: string; px: number }[] = []

    const describe = (el: Element) => {
      const parts: string[] = []
      let cur: Element | null = el
      while (cur && cur !== document.body && parts.length < 4) {
        let s = cur.tagName.toLowerCase()
        if (cur.id) s += `#${cur.id}`
        const cls = Array.from(cur.classList).filter(c => !/^(is-|reveal)/.test(c)).slice(0, 2)
        if (cls.length) s += '.' + cls.join('.')
        parts.unshift(s)
        cur = cur.parentElement
      }
      return parts.join(' > ')
    }

    const skip = (el: Element) =>
      el.closest('[aria-hidden="true"], [data-allow-overflow], script, style, noscript') !== null ||
      !(el as HTMLElement).checkVisibility?.({ opacityProperty: true, visibilityProperty: true })

    // Nearest ancestor that hides overflow sideways (its edges are where text gets cut).
    const clipper = (el: Element): Element | null => {
      for (let cur = el.parentElement; cur && cur !== document.documentElement; cur = cur.parentElement) {
        const ox = getComputedStyle(cur).overflowX
        if (ox !== 'visible') return cur
      }
      return null
    }

    // 1. Sideways scrolling of the whole page.
    const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
    if (sw > vw + TOL) {
      problems.push({ kind: 'page scrolls sideways', where: 'document', text: `page is ${sw}px wide on a ${vw}px screen`, px: sw - vw })
    }

    // 2. Text that runs off screen or is cut off by its box.
    const seen = new Set<Element>()
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim()
      const parent = node.parentElement
      if (!text || !parent || seen.has(parent) || skip(parent)) continue
      const range = document.createRange()
      range.selectNodeContents(node)
      const rects = Array.from(range.getClientRects()).filter(r => r.width > 1 && r.height > 1)
      if (!rects.length) continue
      const left = Math.min(...rects.map(r => r.left))
      const right = Math.max(...rects.map(r => r.right))

      let over = Math.max(right - vw, -left)
      let kind = 'text runs off screen'
      const clip = clipper(parent)
      if (clip && over <= TOL) {
        const box = clip.getBoundingClientRect()
        const cutRight = right - box.right
        const cutLeft = box.left - left
        // A scrollable box (tag row, code block) is fine as long as it is on screen.
        const scrollable = ['auto', 'scroll'].includes(getComputedStyle(clip).overflowX)
        if (!scrollable && Math.max(cutRight, cutLeft) > TOL) {
          over = Math.max(cutRight, cutLeft)
          kind = 'text cut off by its box'
        }
      }
      if (over > TOL) {
        seen.add(parent)
        problems.push({ kind, where: describe(parent), text: text.slice(0, 60), px: Math.round(over) })
      }
    }

    // 3. Images and media wider than the screen (unless their box clips them).
    for (const el of Array.from(document.querySelectorAll('img, video, iframe, canvas, svg, table, pre'))) {
      if (skip(el) || el.parentElement?.closest('svg')) continue
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      const over = Math.max(r.right - vw, -r.left)
      if (over <= TOL) continue
      const clip = clipper(el)
      if (clip) {
        const box = clip.getBoundingClientRect()
        if (box.left >= -TOL && box.right <= vw + TOL) continue
      }
      problems.push({ kind: `${el.tagName.toLowerCase()} wider than screen`, where: describe(el), text: (el.getAttribute('alt') || el.getAttribute('src') || '').slice(0, 60), px: Math.round(over) })
    }

    return problems
  })
}

async function check(page: Page, label: string) {
  await page.waitForLoadState('domcontentloaded')
  await page.evaluate(() => document.fonts.ready)
  const problems = await findOverflow(page)
  const shot = await page.screenshot({ fullPage: false, animations: 'disabled', timeout: 12_000 }).catch(() => null)
  if(shot) await test.info().attach(`${label}.png`, { body: shot, contentType: 'image/png' })
  const report = problems.map(p => `  • [${p.kind}] +${p.px}px  ${p.where}  “${p.text}”`).join('\n')
  expect(problems, `${label}: content spills past the phone screen\n${report}`).toEqual([])
}

test.describe('home page', () => {
  test('default view', async ({ page }) => {
    await page.goto('/')
    await check(page, 'home')
  })

  test('menu open', async ({ page }) => {
    await page.goto('/classic/full')
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await check(page, 'home-menu-open')
  })

  test('coursework and workflow expanded', async ({ page }) => {
    await page.goto('/classic/full')
    // Only one coursework panel opens at a time, so check each in turn.
    const toggles = page.getByRole('button', { name: /view coursework/i })
    const count = await toggles.count()
    for (let i = 0; i < count; i++) {
      await page.getByRole('button', { name: /view coursework/i }).nth(i).click()
      await check(page, `home-coursework-${i + 1}`)
      await page.getByRole('button', { name: /hide coursework/i }).click()
    }
    await page.getByRole('button', { name: /research workflow/i }).click()
    await expect(page.locator('.research-system-title')).toHaveText('AI-Native Research & Product System')
    await expect(page.locator('.research-steps li')).toHaveCount(6)
    await expect(page.locator('.research-notes')).toContainText('Foundation models')
    await expect(page.locator('.research-notes')).toContainText('RLHF')
    await check(page, 'home-workflow')
  })
  test('alchemy chapter and skip', async ({ page }) => {
    await page.goto('/')
    const pet = page.getByRole('button', { name: 'Say hello to the pixel marmoset' })
    await expect(pet).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Mix two ingredients to uncover a chapter of Wenyi’s story.' })).toBeVisible()
    await expect(page.getByText('THE ALCHEMY ARCHIVE')).toHaveCount(0)
    await expect(page.getByText(/chapters discovered/i)).toHaveCount(0)
    await expect(page.getByText('Golden Marmoset', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Recipe book')).toHaveCount(0)
    await page.getByRole('button', { name: 'Octopus Tentacle' }).click()
    await page.getByRole('button', { name: 'Narcissus' }).click()
    await page.getByRole('button', { name: 'Brew potion' }).click()
    await expect(page.getByText('Education discovered!')).toBeVisible()
    await expect(page.locator('.alchemy-archive-slip')).toBeVisible()
    await expect(page.locator('#education')).toHaveCount(0)
    await page.getByRole('button', { name: 'Education', exact:true }).click()
    await expect(page.locator('#education')).toBeVisible()
    await expect(page.locator('#experience')).toBeHidden()
    await expect(pet).toBeVisible()
    await check(page, 'alchemy-education')
    await page.getByRole('link', { name: /skip game/i }).click()
    await expect(page).toHaveURL(/\/classic/)
    await expect(page.locator('.archive-paper-stack')).toHaveCount(1)
    await expect(page.locator('.archive-paper-stack .archive-sheet')).toHaveCount(5)
    await expect(pet).toBeVisible()
    await check(page, 'classic')
    await expect(page.locator('.archive-sheet-label .archive-sheet-tape')).toHaveCount(5)
    await expect(page.locator('.archive-sheet-label')).toHaveText(['Education & Awards','Skills','Experience','Projects','About'])
    const titleTapes = await page.locator('.archive-sheet-tape').evaluateAll(tapes => tapes.map(tape => {
      const range = document.createRange(); range.selectNodeContents(tape)
      return {classes:tape.className,margin:tape.getBoundingClientRect().width-range.getBoundingClientRect().width}
    }))
    expect(new Set(titleTapes.map(t => t.classes)).size).toBe(5)
    expect(titleTapes.every(t => t.margin >= 40)).toBe(true)
    await page.getByRole('button', { name: 'Experience', exact:true }).click()
    await expect(page.locator('#experience')).toBeVisible()
    await expect(page.locator('#experience .wax-seal')).toHaveCount(5)
    await expect(page.locator('#education')).toBeHidden()
    await page.getByRole('button', { name: 'About', exact:true }).click()
    await expect(page.locator('#about')).toBeVisible()
    await expect(page.locator('.hero-meta')).toHaveText('Bay Area · Ann Arbor · Beijing')
    await expect(page.locator('#about')).not.toContainText('unconventional')
    const inlineSeals = page.locator('#about .inline-brand .wax-seal')
    await expect(inlineSeals).toHaveCount(2)
    for (const seal of await inlineSeals.all()) {
      const box=await seal.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.width).toBeCloseTo(box!.height, 1)
      expect(box!.width).toBeCloseTo(20, 1)
    }
    await expect(page.locator('#contact')).toBeVisible()
    await expect(page.locator('.hero-editorial .socials')).toHaveCount(0)
    await expect(page.locator('#contact .footer-links a')).toHaveCount(4)
    await expect(page.locator('.archive-photo-frame')).toHaveCount(4)
    await expect(page.locator('.archive-photo-tape')).toHaveCount(4)
    await expect(page.locator('.archive-paper-stack .archive-sheet')).toHaveCount(5)
    await page.getByRole('link', { name:'View full portfolio' }).click()
    await expect(page).toHaveURL(/\/classic\/full/)
    await expect(page.locator('#experience')).toBeAttached()
  })
})

test.describe('hobbies page', () => {
  test('default view', async ({ page }) => {
    await page.goto('/hobbies')
    await check(page, 'hobbies')
  })
  test('page navigation uses paper corners without visible navigation controls', async ({ page }) => {
    await page.goto('/hobbies#embroidery')
    const footer=page.locator('#embroidery .journal-leaf-footer')
    await expect(footer.locator('.journal-page-tape')).toHaveCount(1)
    await expect(footer.getByRole('button',{name:'Previous'})).toHaveCount(0)
    await expect(footer.getByRole('button',{name:'Next page'})).toHaveCount(0)
    await page.locator('.journal-paper-corner-right').tap()
    await expect(page.locator('#game-design')).toBeVisible()
    await page.locator('.journal-paper-corner-left').tap()
    await expect(page.locator('#embroidery')).toBeVisible()
    await page.locator('.journal-book').focus()
    await page.locator('.journal-book').press('ArrowRight')
    await expect(page.locator('#game-design')).toBeVisible()
    await page.locator('#game-design .journal-leaf-footer').getByRole('button',{name:'Contents'}).click()
    await expect(page.locator('.journal-intro')).toBeVisible()
  })
  test('game tape links and circular tarot', async ({ page }) => {
    await page.goto('/hobbies#game-design')
    await expect(page.getByRole('link', { name: 'Sultan’s Game on Steam' })).toHaveAttribute('href','https://store.steampowered.com/app/3117820/Sultans_Game/')
    await page.goto('/hobbies#afterglow')
    await expect(page.getByRole('link', { name: 'Play Afterglow' })).toHaveAttribute('href','https://afterglow-gray-five.vercel.app/')
    const ring = page.locator('.journal-tarot-ring')
    await expect(ring).toBeVisible()
    await expect(ring.locator('.journal-ring-card')).toHaveCount(7)
    const front = ring.locator('.journal-ring-card').nth(3)
    await expect(front).toHaveAttribute('aria-label','The Fool, Jordan Park')
    await ring.focus()
    await ring.press('ArrowLeft')
    await expect(front).toHaveAttribute('aria-label','The World, Chloe Bennett')
    await ring.press('ArrowRight')
    await expect(front).toHaveAttribute('aria-label','The Fool, Jordan Park')
    await expect(page.locator('#afterglow-tarot .tarot-controls')).toHaveCount(0)
    await front.click()
    await expect(page.locator('.journal-detail')).toBeVisible()
  })
  test('handwriting and non-repeating pressed flowers', async ({ page }) => {
    await page.goto('/hobbies')
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('.journal-intro p')).toHaveCSS('font-family', /La Belle Aurore/)
    expect(await page.evaluate(() => document.fonts.check('16px "La Belle Aurore"'))).toBe(true)
    const titleFont = await page.locator('.journal-intro h1').evaluate(el => getComputedStyle(el).fontFamily)
    expect(titleFont).toContain('VT323')
    const pages = await page.locator('.journal-spread:not(.journal-detail) .journal-leaf').evaluateAll(els => els.map(el => Array.from(el.querySelectorAll('.scrap-pressed')).map(stem => Array.from(stem.classList).find(c => /^scrap-pressed-\d$/.test(c)))))
    for (let i = 1; i < pages.length; i++) expect(pages[i].filter(kind => pages[i - 1].includes(kind))).toEqual([])
    const tapeCounts = await page.locator('.scrap-collage').evaluateAll(els => els.map(el => ({ taped: el.classList.contains('scrap-collage-taped'), tapes: el.querySelectorAll('.scrap-tape').length })))
    expect(tapeCounts.every(({taped, tapes}) => taped ? tapes === 1 : tapes === 0)).toBe(true)
  })
  test('scrapbook assets and running companion', async ({ page }) => {
    await page.goto('/hobbies#embroidery')
    await expect(page.locator('#embroidery')).toBeVisible()
    await expect(page.locator('#embroidery .scrap-paper-frame')).toHaveCount(2)
    await expect(page.locator('.journal-keywords')).toHaveCount(0)
    await expect(page.locator('img[src*="/rainforest/orchid"],img[src*="/rainforest/fern"]')).toHaveCount(0)
    await page.getByRole('button', { name: 'View full size: Blue bird' }).click()
    await expect(page.locator('.journal-detail')).toBeVisible()
    await page.getByRole('button', { name: 'Back to chapter' }).click()
    await expect(page.locator('#embroidery')).toBeVisible()
    await page.goto('/hobbies#running')
    await expect(page.locator('.running-monkey')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Pause' })).toHaveCount(0)
    await expect(page.getByRole('button',{name:'Say hello to the pixel marmoset'})).toBeVisible()
    const collage = page.locator('#running .scrap-collage').first()
    await expect(collage.locator('.scrap-stem-0')).toBeVisible()
    const stem = await collage.locator('.scrap-stem-0').boundingBox()
    expect(stem?.width).toBeGreaterThan(100)
  })

  test('menu open', async ({ page }) => {
    await page.goto('/hobbies')
    const menu = page.getByRole('button', { name: /open navigation|menu/i }).first()
    if (await menu.count()) {
      await menu.click()
      await check(page, 'hobbies-menu-open')
    }
  })
  test('matching pixel navigation and return to archive', async ({ page }) => {
    await page.goto('/hobbies')
    const nav=page.getByRole('navigation',{name:'Portfolio navigation'})
    await expect(nav).toHaveCSS('font-family', /VT323/)
    const labels=await nav.locator('.portfolio-topnav-links a').allTextContents()
    await page.locator('.journal-spread:not([hidden])').getByRole('link',{name:'Back to portfolio'}).click()
    await expect(page).toHaveURL(/\/classic$/)
    await expect(nav).toHaveCSS('font-family', /VT323/)
    expect(await nav.locator('.portfolio-topnav-links a').allTextContents()).toEqual(labels)
    await expect(page.locator('.archive-paper-stack')).toBeVisible()
  })
  test('fashion swatches and varied tapes', async ({ page }) => {
    await page.goto('/hobbies#fashion-design')
    const grid = page.locator('.journal-fashion-grid')
    await expect(grid).toBeVisible()
    await expect(grid.locator('.scrap-tape-5')).toHaveCount(1)
    await expect(grid.locator('.scrap-tape-6')).toHaveCount(1)
    const tapes = await grid.locator('.scrap-tape').evaluateAll(els => els.map(el => getComputedStyle(el).getPropertyValue('--tape-angle')))
    expect(new Set(tapes).size).toBe(2)
    const top = await grid.locator('.scrap-tape').evaluateAll(els => els.map(el => el.getBoundingClientRect().top))
    const pageTop = await grid.evaluate(el => el.closest('.journal-leaf-content')!.getBoundingClientRect().top)
    expect(top.every(y => y >= pageTop)).toBe(true)
    for (const [title, color] of [['Vermilion Swallows','red'],['Navy Blossoms','navy'],['Snow Plum','snow-plum']]) {
      await page.getByRole('button', { name: `Open ${title} qipao design and pattern details` }).click()
      await expect(page.locator('.journal-swatch img')).toHaveAttribute('src', `/hobbies/scrapbook/swatch-${color}.webp`)
      await page.getByRole('button', { name: 'Back to chapter' }).click()
    }
  })
})
