// src/pages/HymnPage.jsx
// Programmatic hymn pages (spec §4.3). Public-domain hymns get full lyrics;
// others get metadata + first line with the lyrics behind the in-app library
// (copyright gate). Schema: MusicComposition + breadcrumbs + speakable.
import { Link, useParams } from 'react-router-dom'
import { Music, ArrowRight, BookOpen } from 'lucide-react'
import PageMeta from '../components/seo/PageMeta'
import { hymns } from '../data/hymns'
import { CATEGORY_NOTES, relatedHymns } from '../data/hymnMeta'
import { KenteBand, CeremonialDivider } from '../components/ceremonial'

const CATEGORY_LABELS = {
  processional: 'Processional', worship: 'Worship & Praise', comfort: 'Comfort',
  committal: 'Committal', recessional: 'Recessional',
}

export default function HymnPage() {
  const { slug } = useParams()
  const hymn = hymns.find((h) => h.slug === slug)

  if (!hymn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center px-4">
        <div>
          <h1 className="text-xl font-semibold text-card-foreground mb-2">Hymn not found</h1>
          <Link to="/hymns" className="text-sm text-primary hover:underline">Browse the hymn library</Link>
        </div>
      </div>
    )
  }

  const related = relatedHymns(hymn, hymns, 5)
  const firstLine = hymn.verses[0]?.split('\n')[0] || ''
  const categoryLabel = CATEGORY_LABELS[hymn.category] || hymn.category

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title={`${hymn.title} — Funeral Hymn Lyrics | FuneralPress`}
        description={`${hymn.title}${hymn.author ? ` by ${hymn.author}` : ''} — ${categoryLabel.toLowerCase()} funeral hymn${hymn.language === 'twi' ? ' in Twi' : ''}. ${hymn.publicDomain ? 'Full lyrics' : 'Details'} and how it is used in Ghanaian funeral services.`}
        path={`/hymns/${hymn.slug}`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Hymn Library', path: '/hymns' },
          { name: hymn.title, path: `/hymns/${hymn.slug}` },
        ]}
        speakable={['.hymn-context']}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'MusicComposition',
          name: hymn.title,
          ...(hymn.author ? { composer: { '@type': 'Person', name: hymn.author } } : {}),
          inLanguage: hymn.language === 'twi' ? 'tw' : 'en',
          genre: 'Hymn',
          ...(hymn.publicDomain ? { copyrightNotice: 'Public domain' } : {}),
        }}
      />

      <div className="max-w-2xl mx-auto px-4 pt-12 pb-16">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted-foreground mb-6">
          <Link to="/hymns" className="hover:text-primary">Hymn Library</Link>
          <span className="mx-2">/</span>
          <span>{hymn.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-primary mb-2">
            <Music size={14} />
            {categoryLabel} hymn{hymn.language === 'twi' ? ' · Twi' : ''}
          </div>
          <h1 className="text-3xl font-bold text-card-foreground mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            {hymn.title}
          </h1>
          {hymn.author && <p className="text-sm text-muted-foreground">{hymn.author}</p>}
        </div>

        <CeremonialDivider symbol="sankofa" />

        {/* Occasion context (speakable) */}
        <p className="hymn-context text-sm text-muted-foreground leading-relaxed mb-8">
          {CATEGORY_NOTES[hymn.category]}
        </p>

        {/* Lyrics or copyright-gated metadata */}
        {hymn.publicDomain ? (
          <div className="space-y-6 mb-10">
            {hymn.verses.map((verse, i) => (
              <div key={i}>
                <p className="text-xs text-muted-foreground mb-1">Verse {i + 1}</p>
                <p className="text-base text-card-foreground leading-relaxed whitespace-pre-line">{verse}</p>
                {hymn.chorus && i === 0 && (
                  <div className="mt-4 pl-4 border-l-2 border-primary/30">
                    <p className="text-xs text-muted-foreground mb-1">Chorus</p>
                    <p className="text-base text-card-foreground leading-relaxed italic whitespace-pre-line">{hymn.chorus}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-6 mb-10">
            <p className="text-sm text-card-foreground mb-1 italic">"{firstLine}…"</p>
            <p className="text-xs text-muted-foreground">
              The full lyrics are available in the hymn library inside the app, where you can add them directly to a funeral programme.
            </p>
          </div>
        )}

        {/* CTA */}
        <Link
          to={`/editor?hymn=${hymn.slug}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors mb-12"
        >
          Add this hymn to a funeral programme
          <ArrowRight size={15} />
        </Link>

        {/* Related */}
        <h2 className="text-lg font-semibold text-card-foreground mb-4">Related hymns</h2>
        <div className="space-y-2">
          {related.map((r) => (
            <Link
              key={r.slug}
              to={`/hymns/${r.slug}`}
              className="overflow-hidden flex flex-col bg-card border border-border rounded-lg hover:border-primary/40 transition-colors"
            >
              <KenteBand size="card" />
              <div className="flex items-center gap-3 px-4 py-3">
                <BookOpen size={15} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-card-foreground truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[r.category] || r.category}{r.author ? ` · ${r.author}` : ''}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
