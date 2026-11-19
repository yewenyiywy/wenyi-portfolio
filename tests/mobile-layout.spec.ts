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
 * A full-page screenshot of every page and state is attached to each test.
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
        const cls = [...cur.classList].filter(c => !/^(is-|reveal)/.test(c)).slice(0, 2)
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
      const rects = [...range.getClientRects()].filter(r => r.width > 1 && r.height > 1)
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
    for (const el of document.querySelectorAll('img, video, iframe, canvas, svg, table, pre')) {
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
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  const shot = await page.screenshot({ fullPage: true })
  await test.info().attach(`${label}.png`, { body: shot, contentType: 'image/png' })

  const problems = await findOverflow(page)
  const report = problems.map(p => `  • [${p.kind}] +${p.px}px  ${p.where}  “${p.text}”`).join('\n')
  expect(problems, `${label}: content spills past the phone screen\n${report}`).toEqual([])
}

test.describe('home page', () => {
  test('default view', async ({ page }) => {
    await page.goto('/')
    await check(page, 'home')
  })

  test('menu open', async ({ page }) => {
    await page.goto('/classic')
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await check(page, 'home-menu-open')
  })

  test('coursework and workflow expanded', async ({ page }) => {
    await page.goto('/classic')
    // Only one coursework panel opens at a time, so check each in turn.
    const toggles = page.getByRole('button', { name: /view coursework/i })
    const count = await toggles.count()
    for (let i = 0; i < count; i++) {
      await page.getByRole('button', { name: /view coursework/i }).nth(i).click()
      await check(page, `home-coursework-${i + 1}`)
      await page.getByRole('button', { name: /hide coursework/i }).click()
    }
    await page.getByRole('button', { name: /research workflow/i }).click()
    await check(page, 'home-workflow')
  })
  test('alchemy chapter and skip', async ({ page }) => {
    await page.goto('/')
    const pet = page.getByRole('button', { name: 'Say hello to the pixel marmoset' })
    await expect(pet).toBeVisible()
    await page.getByRole('button', { name: 'Education' }).click()
    await page.getByRole('button', { name: 'Brew potion' }).click()
    await expect(page.getByText('Education discovered!')).toBeVisible()
    await expect(page.locator('#education')).toBeVisible()
    await expect(page.locator('#experience')).toBeHidden()
    await expect(pet).toBeVisible()
    await check(page, 'alchemy-education')
    await page.getByRole('link', { name: /skip game/i }).click()
    await expect(page.locator('#experience')).toBeAttached()
    await expect(page).toHaveURL(/\/classic/)
    await expect(pet).toBeVisible()
    await check(page, 'classic')
  })
})

test.describe('hobbies page', () => {
  test('default view', async ({ page }) => {
    await page.goto('/hobbies')
    await check(page, 'hobbies')
  })

  test('menu open', async ({ page }) => {
    await page.goto('/hobbies')
    const menu = page.getByRole('button', { name: /open navigation|menu/i }).first()
    if (await menu.count()) {
      await menu.click()
      await check(page, 'hobbies-menu-open')
    }
  })
})
