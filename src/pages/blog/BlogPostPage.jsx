import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import PageMeta from '../../components/seo/PageMeta'
import blogPosts from '../../data/blogPosts'

const API_BASE = import.meta.env.VITE_AUTH_API_URL || 'https://funeralpress-auth-api.ghwmelite.workers.dev'

const NOT_FOUND = Symbol('not-found')

export default function BlogPostPage() {
  const { slug } = useParams()
  const staticPost = blogPosts.find((p) => p.slug === slug)
  // Fetched D1 posts keyed by slug — loading/not-found derive from the map,
  // so the effect never calls setState synchronously and navigating between
  // two dynamic posts can't flash stale content.
  const [fetched, setFetched] = useState({})

  useEffect(() => {
    if (staticPost || fetched[slug] !== undefined) return
    fetch(`${API_BASE}/blog/published/${encodeURIComponent(slug)}`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((d) => setFetched((prev) => ({ ...prev, [slug]: d.post })))
      .catch(() => setFetched((prev) => ({ ...prev, [slug]: NOT_FOUND })))
  }, [slug, staticPost, fetched])

  const dynamicPost = fetched[slug]
  const loading = !staticPost && dynamicPost === undefined
  const notFound = dynamicPost === NOT_FOUND
  const post = staticPost || (notFound ? null : dynamicPost)

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!post || notFound) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The guide you are looking for does not exist.
          </p>
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium"
          >
            &larr; Back to Guides
          </Link>
        </div>
      </div>
    )
  }

  const relatedPosts = blogPosts.filter((p) => p.slug !== slug)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title={`${post.title} | FuneralPress`}
        description={post.description}
        path={`/blog/${post.slug}`}
        type="article"
        article={{
          datePublished: post.date,
          dateModified: post.date,
          keywords: post.keywords,
        }}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: post.title, path: `/blog/${post.slug}` },
        ]}
      />

      <article className="max-w-3xl mx-auto px-4 py-16">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          &larr; Back to Guides
        </Link>

        <header className="mb-10">
          <time className="text-sm text-muted-foreground">
            {new Date(post.date).toLocaleDateString('en-GB', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mt-2 leading-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {post.title}
          </h1>
        </header>

        <div className="space-y-5">
          {post.content.map((section, i) => {
            if (section.type === 'heading') {
              return (
                <h2
                  key={i}
                  className="text-xl font-semibold text-foreground mt-8 mb-2"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {section.text}
                </h2>
              )
            }

            if (section.type === 'paragraph') {
              return (
                <p key={i} className="text-foreground/90 leading-relaxed">
                  {section.text}
                </p>
              )
            }

            if (section.type === 'list') {
              return (
                <ul key={i} className="space-y-2 pl-5">
                  {section.items.map((item, j) => (
                    <li
                      key={j}
                      className="text-foreground/90 leading-relaxed list-disc marker:text-primary/60"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )
            }

            if (section.type === 'cta') {
              if (!section.link) return null
              const isExternal = section.link?.startsWith('http')
              return (
                <div key={i} className="my-8 text-center">
                  {isExternal ? (
                    <a
                      href={section.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors text-sm"
                    >
                      {section.text} &rarr;
                    </a>
                  ) : (
                    <Link
                      to={section.link}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors text-sm"
                    >
                      {section.text} &rarr;
                    </Link>
                  )}
                </div>
              )
            }

            return null
          })}
        </div>
      </article>

      {/* Related Posts */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="border-t border-border pt-10">
          <h2 className="text-lg font-semibold text-foreground mb-6">More Guides</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {relatedPosts.map((rp) => (
              <Link
                key={rp.slug}
                to={`/blog/${rp.slug}`}
                className="group block bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-all"
              >
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                  {rp.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {rp.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
