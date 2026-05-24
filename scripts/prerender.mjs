// scripts/prerender.mjs
// Post-build prerender: serve dist/ with `vite preview`, drive headless
// Chromium to each content route, capture the fully-rendered HTML (content +
// Helmet meta + JSON-LD), and write it to dist/<route>/index.html so non-JS
// crawlers (AI engines, social scrapers) see real content.
import { spawn } from 'node:child_process'
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
const PORT = 4183
const BASE = `http://127.0.0.1:${PORT}`

function log(m) { process.stdout.write(`[prerender] ${m}\n`) }

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
      const r = document.getElementById('root')
      return r && r.innerText.trim().length > 150
    },
    { timeout: 15000 },
  )
  return page.content()
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
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const failures = []
  try {
    await waitForServer(BASE + '/')
    const page = await browser.newPage()
    for (const route of routes) {
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
      writeFileSync(out, html, 'utf8')
      log(`done ${route} -> ${out.replace(ROOT, '.')}`)
    }
  } finally {
    await browser.close()
    preview.kill()
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
