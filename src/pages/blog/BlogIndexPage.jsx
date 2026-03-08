import { Link } from 'react-router-dom'
import PageMeta from '../../components/seo/PageMeta'
import blogPosts from '../../data/blogPosts'

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="FuneralPress Blog — Funeral Planning Tips & Guides"
        description="Expert guides on funeral planning in Ghana. Learn about costs, customs, brochure design tips, hymn selections, and how to honour your loved ones beautifully."
        path="/blog"
      />

      <div className="max-w-4xl mx-auto px-4 py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-10"
        >
          &larr; Back to FuneralPress
        </Link>

        <h1
          className="text-3xl sm:text-4xl font-bold text-foreground mb-3"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Funeral Planning Guides
        </h1>
        <p className="text-muted-foreground text-lg mb-12">
          Practical guides for planning dignified funerals in Ghana
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group block bg-card border border-border rounded-xl p-6 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <time className="text-xs text-muted-foreground">
                {new Date(post.date).toLocaleDateString('en-GB', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              <h2 className="text-lg font-semibold text-foreground mt-2 mb-2 group-hover:text-primary transition-colors leading-snug">
                {post.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {post.description}
              </p>
              <span className="text-sm font-medium text-primary">
                Read Guide &rarr;
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
