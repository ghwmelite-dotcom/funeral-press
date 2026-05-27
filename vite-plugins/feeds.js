import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { SITE_URL, escapeXml, renderContentToHtml } from './blog-content-html.js'

const FEED_TITLE = 'FuneralPress Blog — Funeral Planning Guides'
const FEED_DESCRIPTION =
  'Expert guides on funeral planning in Ghana. Learn about costs, customs, ' +
  'brochure design tips, hymn selections, and how to honour your loved ones beautifully.'
const BLOG_URL = `${SITE_URL}/blog`
const FEED_IMAGE = `${SITE_URL}/og-image.png`
const FEED_ICON = `${SITE_URL}/icon-512.png`
const AUTHOR_NAME = 'FuneralPress'

// post.date is 'YYYY-MM-DD'; interpret it as midnight UTC.
function postDate(post) {
  return new Date(`${post.date}T00:00:00Z`)
}

// "Wed, 11 Mar 2026 00:00:00 GMT" — Date#toUTCString is exactly RFC-822/1123.
function toRfc822(date) {
  return date.toUTCString()
}

// "2026-03-11T00:00:00Z" — RFC-3339 without fractional seconds.
function toRfc3339(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function postUrl(slug) {
  return `${SITE_URL}/blog/${slug}`
}

// Posts with a slug, newest first. String compare is correct for ISO dates.
function orderedPosts(blogPosts) {
  return blogPosts
    .filter((post) => post && post.slug)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
}

export function buildRssFeed({ blogPosts = [] } = {}) {
  const posts = orderedPosts(blogPosts)
  const lastBuild = posts.length ? postDate(posts[0]) : new Date()
  const year = new Date().getFullYear()

  const items = posts.map((post) => {
    const url = postUrl(post.slug)
    const html = renderContentToHtml(post.content)
    const categories = (post.keywords || [])
      .map((kw) => `      <category>${escapeXml(kw)}</category>`)
      .join('\n')
    return [
      '    <item>',
      `      <title>${escapeXml(post.title)}</title>`,
      `      <link>${escapeXml(url)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
      `      <pubDate>${toRfc822(postDate(post))}</pubDate>`,
      `      <description>${escapeXml(post.description)}</description>`,
      `      <content:encoded><![CDATA[${html}]]></content:encoded>`,
      categories,
      `      <dc:creator>${escapeXml(AUTHOR_NAME)}</dc:creator>`,
      '    </item>',
    ]
      .filter(Boolean)
      .join('\n')
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" ' +
      'xmlns:atom="http://www.w3.org/2005/Atom" ' +
      'xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    `    <title>${escapeXml(FEED_TITLE)}</title>`,
    `    <link>${escapeXml(BLOG_URL)}</link>`,
    `    <description>${escapeXml(FEED_DESCRIPTION)}</description>`,
    '    <language>en</language>',
    `    <lastBuildDate>${toRfc822(lastBuild)}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(`${SITE_URL}/rss.xml`)}" rel="self" type="application/rss+xml" />`,
    '    <generator>FuneralPress</generator>',
    `    <copyright>© ${year} ${escapeXml(AUTHOR_NAME)}</copyright>`,
    '    <image>',
    `      <url>${escapeXml(FEED_IMAGE)}</url>`,
    `      <title>${escapeXml(FEED_TITLE)}</title>`,
    `      <link>${escapeXml(BLOG_URL)}</link>`,
    '    </image>',
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}

export function buildAtomFeed({ blogPosts = [] } = {}) {
  const posts = orderedPosts(blogPosts)
  const updated = posts.length ? postDate(posts[0]) : new Date()
  const year = new Date().getFullYear()

  const entries = posts.map((post) => {
    const url = postUrl(post.slug)
    const html = renderContentToHtml(post.content)
    const published = toRfc3339(postDate(post))
    const categories = (post.keywords || [])
      .map((kw) => `    <category term="${escapeXml(kw)}" />`)
      .join('\n')
    return [
      '  <entry>',
      `    <title>${escapeXml(post.title)}</title>`,
      `    <link rel="alternate" href="${escapeXml(url)}" />`,
      `    <id>${escapeXml(url)}</id>`,
      `    <published>${published}</published>`,
      `    <updated>${published}</updated>`,
      `    <summary>${escapeXml(post.description)}</summary>`,
      `    <content type="html"><![CDATA[${html}]]></content>`,
      categories,
      `    <author><name>${escapeXml(AUTHOR_NAME)}</name></author>`,
      '  </entry>',
    ]
      .filter(Boolean)
      .join('\n')
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">',
    `  <title>${escapeXml(FEED_TITLE)}</title>`,
    `  <subtitle>${escapeXml(FEED_DESCRIPTION)}</subtitle>`,
    `  <link rel="alternate" href="${escapeXml(BLOG_URL)}" />`,
    `  <link rel="self" href="${escapeXml(`${SITE_URL}/atom.xml`)}" />`,
    `  <id>${escapeXml(BLOG_URL)}</id>`,
    `  <updated>${toRfc3339(updated)}</updated>`,
    `  <icon>${escapeXml(FEED_ICON)}</icon>`,
    `  <logo>${escapeXml(FEED_IMAGE)}</logo>`,
    `  <rights>© ${year} ${escapeXml(AUTHOR_NAME)}</rights>`,
    '  <generator>FuneralPress</generator>',
    `  <author><name>${escapeXml(AUTHOR_NAME)}</name></author>`,
    ...entries,
    '</feed>',
    '',
  ].join('\n')
}

export function buildJsonFeed({ blogPosts = [] } = {}) {
  const posts = orderedPosts(blogPosts)
  const author = { name: AUTHOR_NAME, url: SITE_URL }

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: FEED_TITLE,
    home_page_url: BLOG_URL,
    feed_url: `${SITE_URL}/feed.json`,
    description: FEED_DESCRIPTION,
    language: 'en',
    icon: FEED_IMAGE,
    favicon: FEED_ICON,
    authors: [author],
    items: posts.map((post) => ({
      id: postUrl(post.slug),
      url: postUrl(post.slug),
      title: post.title,
      summary: post.description,
      content_html: renderContentToHtml(post.content),
      date_published: toRfc3339(postDate(post)),
      tags: post.keywords || [],
      authors: [author],
    })),
  }

  return `${JSON.stringify(feed, null, 2)}\n`
}

/**
 * Vite plugin that emits dist/rss.xml, dist/atom.xml, and dist/feed.json after
 * the build completes. Runs on closeBundle so it executes after Vite copies
 * public/ assets, mirroring funeralpress-sitemap.
 *
 * @param {object} [opts]
 * @param {Array<{slug: string, title?: string, description?: string, date?: string, keywords?: string[], content?: object[]}>} [opts.blogPosts]
 * @param {string} [opts.outDir='dist']
 */
export default function feedsPlugin(opts = {}) {
  return {
    name: 'funeralpress-feeds',
    apply: 'build',
    closeBundle() {
      const outDir = opts.outDir || 'dist'
      const files = [
        ['rss.xml', buildRssFeed(opts)],
        ['atom.xml', buildAtomFeed(opts)],
        ['feed.json', buildJsonFeed(opts)],
      ]
      for (const [name, content] of files) {
        const outPath = resolve(outDir, name)
        writeFileSync(outPath, content, 'utf8')
        console.log(`[feeds] wrote ${outPath}`)
      }
    },
  }
}
