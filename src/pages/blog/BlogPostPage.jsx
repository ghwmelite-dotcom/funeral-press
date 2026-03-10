import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import PageMeta from '../../components/seo/PageMeta'
import blogPosts from '../../data/blogPosts'

export default function BlogPostPage() {
  const { slug } = useParams()
  const post = blogPosts.find((p) => p.slug === slug)

  if (!post) {
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Organization',
      name: 'FuneralPress',
      url: 'https://funeralpress.org',
    },
    publisher: {
      '@type': 'Organization',
      name: 'FuneralPress',
      url: 'https://funeralpress.org',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://funeralpress.org/blog/${post.slug}`,
    },
    keywords: post.keywords.join(', '),
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title={`${post.title} | FuneralPress`}
        description={post.description}
        path={`/blog/${post.slug}`}
        type="article"
      />

      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

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
              const isExternal = section.link.startsWith('http')
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
