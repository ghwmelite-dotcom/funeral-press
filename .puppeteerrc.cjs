/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Point to the locally downloaded Chrome 149 build so the prerender
  // script works without relying on the pinned build (146) that cannot be
  // fetched from the CDN in this environment.
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    'C:\\Users\\USER\\.cache\\puppeteer\\chrome\\win64-149.0.7827.22\\chrome-win64\\chrome.exe',
  // Skip the automatic Chromium download on `npm install`.
  skipDownload: true,
};
