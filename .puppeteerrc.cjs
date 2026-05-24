/**
 * @type {import("puppeteer").Configuration}
 *
 * The Chromium build pinned by this puppeteer release fails to download from
 * the CDN in some environments, so we install the stable Chrome-for-Testing
 * channel instead (`npx puppeteer browsers install chrome`, run locally and in
 * CI) and resolve whatever build landed in puppeteer's cache — no hardcoded,
 * machine-specific path. PUPPETEER_EXECUTABLE_PATH overrides everything.
 */
const { existsSync, readdirSync } = require('node:fs')
const { homedir } = require('node:os')
const { join } = require('node:path')

function resolveInstalledChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH

  const cacheDir = process.env.PUPPETEER_CACHE_DIR || join(homedir(), '.cache', 'puppeteer')
  const chromeRoot = join(cacheDir, 'chrome')
  if (!existsSync(chromeRoot)) return undefined

  // Newest build first (dir names sort lexicographically by version-ish prefix).
  const builds = readdirSync(chromeRoot).sort().reverse()
  const candidates = (build) => [
    join(chromeRoot, build, 'chrome-win64', 'chrome.exe'),
    join(chromeRoot, build, 'chrome-linux64', 'chrome'),
    join(chromeRoot, build, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
    join(chromeRoot, build, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
  ]
  for (const build of builds) {
    for (const exe of candidates(build)) {
      if (existsSync(exe)) return exe
    }
  }
  return undefined
}

const executablePath = resolveInstalledChrome()

module.exports = {
  // Don't attempt the broken pinned-build download on install; provisioning is
  // explicit via `npx puppeteer browsers install chrome`.
  skipDownload: true,
  ...(executablePath ? { executablePath } : {}),
}
