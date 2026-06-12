// scripts/check-crawlers.mjs
// Verifies AI/search crawlers can fetch production pages through Cloudflare.
// Run: node scripts/check-crawlers.mjs [base-url]
// Exit 0 = all pass; exit 1 = at least one blocked (fix via Cloudflare
// Configuration Rule, same as the feeds BIC fix).

const BASE = process.argv[2] || 'https://funeralpress.org'
const BOTS = {
  GPTBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
  ClaudeBot: 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  PerplexityBot: 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
  'Google-Extended': 'Mozilla/5.0 (compatible; Google-Extended/1.0)',
  Googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  Bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
}
const PATHS = ['/', '/hymns', '/blog', '/funeral-services/greater-accra', '/diaspora/plan-a-funeral-in-ghana-from-abroad', '/sitemap.xml', '/rss.xml']

let failed = 0
for (const [bot, ua] of Object.entries(BOTS)) {
  for (const path of PATHS) {
    try {
      const res = await fetch(BASE + path, { headers: { 'User-Agent': ua }, redirect: 'follow' })
      const ok = res.status >= 200 && res.status < 400
      if (!ok) failed++
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${String(res.status).padEnd(4)} ${bot.padEnd(16)} ${path}`)
    } catch (e) {
      failed++
      console.log(`FAIL  ERR  ${bot.padEnd(16)} ${path}  ${e.message}`)
    }
  }
}
console.log(failed ? `\n${failed} checks FAILED — add a Cloudflare Configuration Rule (disable Bot Fight Mode / browser integrity check) for these user agents or paths, as was done for the feed paths.` : '\nAll crawler checks passed.')
process.exit(failed ? 1 : 0)
