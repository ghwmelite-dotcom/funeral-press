/**
 * HTML Cover → MP4 Video Converter
 *
 * Converts animated HTML cover files to MP4 videos using Puppeteer + ffmpeg.
 *
 * Prerequisites:
 *   npm install puppeteer
 *   choco install ffmpeg -y  (run as admin)
 *
 * Usage:
 *   node html-to-video.mjs                    # Convert all covers
 *   node html-to-video.mjs intro-cover.html   # Convert one specific file
 */

import puppeteer from 'puppeteer'
import { execSync } from 'child_process'
import { mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs'
import { resolve, basename } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { setTimeout as sleep } from 'timers/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// --- CONFIG ---
const WIDTH = 1920
const HEIGHT = 1080
const FPS = 30
const DURATION_SECONDS = 10   // how long to record (enough for all animations)
const TOTAL_FRAMES = FPS * DURATION_SECONDS

const HTML_DIR = resolve(__dirname, 'html-mockups')
const OUTPUT_DIR = resolve(__dirname, 'videos')
const FRAMES_DIR = resolve(__dirname, '_frames')

// --- HELPERS ---
function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function cleanDir(dir) {
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) unlinkSync(resolve(dir, f))
  }
}

function getHtmlFiles(specificFile) {
  if (specificFile) return [specificFile]
  // Only convert cover files (intro/outro), not product mockups
  return readdirSync(HTML_DIR)
    .filter(f => f.endsWith('.html') && (f.includes('intro-cover') || f.includes('outro-cover')))
    .sort()
}

// --- MAIN ---
async function convertToVideo(htmlFile) {
  const htmlPath = resolve(HTML_DIR, htmlFile)
  const videoName = htmlFile.replace('.html', '.mp4')
  const videoPath = resolve(OUTPUT_DIR, videoName)

  console.log(`\n🎬 Converting: ${htmlFile}`)
  console.log(`   Resolution: ${WIDTH}x${HEIGHT} @ ${FPS}fps`)
  console.log(`   Duration:   ${DURATION_SECONDS}s (${TOTAL_FRAMES} frames)`)

  // Clean frames directory
  ensureDir(FRAMES_DIR)
  cleanDir(FRAMES_DIR)

  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      `--window-size=${WIDTH},${HEIGHT}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: WIDTH, height: HEIGHT })

  // Load the HTML file
  const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 })

  // Wait a moment for fonts to load
  await sleep(1000)

  // Reload to capture animations from the very start
  await page.reload({ waitUntil: 'networkidle0' })

  console.log(`   Capturing ${TOTAL_FRAMES} frames...`)

  // Capture frames
  const frameInterval = 1000 / FPS
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const frameNum = String(i).padStart(5, '0')
    await page.screenshot({
      path: resolve(FRAMES_DIR, `frame_${frameNum}.png`),
      type: 'png',
    })

    // Wait for next frame
    if (i < TOTAL_FRAMES - 1) {
      await sleep(frameInterval)
    }

    // Progress indicator
    if ((i + 1) % FPS === 0) {
      process.stdout.write(`   ${Math.round(((i + 1) / TOTAL_FRAMES) * 100)}%`)
    } else if ((i + 1) % 10 === 0) {
      process.stdout.write('.')
    }
  }
  console.log(' done!')

  await browser.close()

  // Stitch frames into MP4 with ffmpeg
  console.log(`   Encoding MP4...`)
  const framesPattern = resolve(FRAMES_DIR, 'frame_%05d.png').replace(/\\/g, '/')
  const outputPath = videoPath.replace(/\\/g, '/')

  const ffmpegCmd = [
    'ffmpeg -y',
    `-framerate ${FPS}`,
    `-i "${framesPattern}"`,
    '-c:v libx264',
    '-pix_fmt yuv420p',
    '-preset slow',
    '-crf 18',                    // high quality (lower = better, 18 is visually lossless)
    `-s ${WIDTH}x${HEIGHT}`,
    `"${outputPath}"`,
  ].join(' ')

  try {
    execSync(ffmpegCmd, { stdio: 'pipe' })
    console.log(`   ✅ Saved: ${videoPath}`)
  } catch (err) {
    console.error(`   ❌ ffmpeg failed:`, err.message)
    console.error(`   Command was: ${ffmpegCmd}`)
  }

  // Cleanup frames
  cleanDir(FRAMES_DIR)
}

async function main() {
  const specificFile = process.argv[2] || null
  const htmlFiles = getHtmlFiles(specificFile)

  if (htmlFiles.length === 0) {
    console.log('No cover HTML files found.')
    process.exit(1)
  }

  console.log('╔══════════════════════════════════════════╗')
  console.log('║   HTML → MP4 Video Converter             ║')
  console.log('║   Puppeteer + ffmpeg                     ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log(`\nFiles to convert: ${htmlFiles.join(', ')}`)

  ensureDir(OUTPUT_DIR)

  for (const file of htmlFiles) {
    await convertToVideo(file)
  }

  // Final cleanup
  if (existsSync(FRAMES_DIR)) {
    try { readdirSync(FRAMES_DIR).length === 0 && unlinkSync(FRAMES_DIR) } catch {}
  }

  console.log(`\n🎉 All done! Videos saved to: ${OUTPUT_DIR}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
