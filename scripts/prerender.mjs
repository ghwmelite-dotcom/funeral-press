// scripts/prerender.mjs
// Post-build prerender: serve dist/ with `vite preview`, drive headless
// Chromium to each content route, capture the fully-rendered HTML (content +
// Helmet meta + JSON-LD), and write it to dist/<route>/index.html so non-JS
// crawlers (AI engines, social scrapers) see real content.
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'
import blogPosts from '../src/data/blogPosts.js'
import { REGIONS } from '../src/data/regions.js'
import { collectPrerenderRoutes } from '../vite-plugins/prerender-routes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist')
// Offset from vite's default preview port (4173) so a running dev/preview
// server doesn't collide with the prerender's --strictPort bind.
const PORT = 4183
const BASE = `http://127.0.0.1:${PORT}`

function log(m) { process.stdout.write(`[prerender] ${m}\n`) }

// On Windows, `spawn(..., { shell: true })` creates cmd.exe → npx → node(vite).
// `child.kill()` only ends cmd.exe and can orphan vite, leaving PORT held so the
// next run fails --strictPort. taskkill /T kills the whole tree.
function killPreview(child) {
  if (process.platform === 'win32' && child.pid) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/f', '/t'], { stdio: 'ignore' })
  } else {
    child.kill()
  }
}

async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`preview server did not start at ${url}`)
}

function outPathForRoute(route) {
  if (route === '/') return join(DIST, 'index.html')
  return join(DIST, route.replace(/^\//, ''), 'index.html')
}

async function renderRoute(page, route) {
  await page.goto(BASE + route, { waitUntil: 'networkidle0', timeout: 45000 })
  await page.waitForFunction(
    () => {
      // Heuristic: a real content page renders well over 150 visible chars,
      // so this fires only after React has mounted the route's content.
      const r = document.getElementById('root')
      return r && r.innerText.trim().length > 150
    },
    { timeout: 15000 },
  )
  // Collapse the duplicate shell + Helmet head tags to a single per-page set,
  // operating on the LIVE DOM (more reliable than regex post-processing):
  //  - <title>: react-helmet-async leaves the captured head with the per-page
  //    title AND the stale shell default, neither marked. document.title is the
  //    authoritative per-page value, so keep exactly the element matching it.
  //  - description / og:* / twitter:*: keep the LAST occurrence of each key
  //    (Helmet's per-page tag is appended after the shell default).
  // This must never strip to zero — an earlier data-rh-based stripper deleted
  // every title because Helmet's title carries no marker.
  await page.evaluate(() => {
    const head = document.head
    const wanted = document.title
    let keptTitle = false
    for (const t of [...head.querySelectorAll('title')]) {
      if (!keptTitle && t.textContent === wanted) { keptTitle = true; continue }
      t.remove()
    }
    const sel = 'meta[name="description"], meta[property^="og:"], meta[name^="twitter:"]'
    const metas = [...head.querySelectorAll(sel)]
    const seen = new Set()
    for (let i = metas.length - 1; i >= 0; i--) {
      const m = metas[i]
      const key = m.getAttribute('property') || m.getAttribute('name')
      if (seen.has(key)) m.remove()
      else seen.add(key)
    }
  })
  return page.content()
}

const CONCURRENCY = parseInt(process.env.PRERENDER_CONCURRENCY || '4', 10)

async function renderAll(browser, routes) {
  const queue = [...routes]
  const failures = []
  async function workerLoop() {
    const page = await browser.newPage()
    for (;;) {
      const route = queue.shift()
      if (!route) break
      let html
      try {
        html = await renderRoute(page, route)
      } catch (err) {
        log(`retry ${route} (${err.message})`)
        try { html = await renderRoute(page, route) } catch (err2) {
          failures.push({ route, error: err2.message })
          log(`FAILED ${route}: ${err2.message}`)
          continue
        }
      }
      const out = outPathForRoute(route)
      mkdirSync(dirname(out), { recursive: true })
      // Head was already de-duplicated in the DOM (see renderRoute): one
      // per-page title + description + og/twitter set.
      writeFileSync(out, html, 'utf8')
      log(`done ${route} -> ${out.replace(ROOT, '.')}`)
    }
    await page.close()
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, workerLoop))
  return failures
}

async function main() {
  const routes = collectPrerenderRoutes({ blogPosts, regions: REGIONS })
  log(`prerendering ${routes.length} routes`)

  const preview = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    { cwd: ROOT, shell: process.platform === 'win32', stdio: 'ignore' },
  )

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  let failures = []
  try {
    await waitForServer(BASE + '/')
    failures = await renderAll(browser, routes)
  } finally {
    await browser.close()
    killPreview(preview)
  }

  if (failures.length) {
    log(`${failures.length} route(s) failed:`)
    for (const f of failures) log(`  - ${f.route}: ${f.error}`)
    process.exit(1)
  }
  log(`done — ${routes.length} routes prerendered`)
}

main().catch((err) => {
  process.stderr.write(`[prerender] ${err.stack || err.message}\n`)
  process.exit(1)
})
