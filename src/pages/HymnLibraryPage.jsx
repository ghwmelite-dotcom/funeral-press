import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import PageMeta from '../components/seo/PageMeta'
import { Search, Music, Copy, Check, BookOpen, ChevronDown, ChevronUp, X } from 'lucide-react'
import hymns from '../data/hymns'

const LANGUAGES = ['All', 'English', 'Twi']
const CATEGORIES = ['All', 'Processional', 'Worship', 'Comfort', 'Committal', 'Recessional']

const languageBadgeColors = {
  english: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  twi: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  ga: 'bg-green-500/15 text-green-400 border-green-500/30'
}

const categoryLabels = {
  processional: 'Processional',
  worship: 'Worship',
  comfort: 'Comfort',
  committal: 'Committal',
  recessional: 'Recessional'
}

export default function HymnLibraryPage() {
  const [search, setSearch] = useState('')
  const [languageFilter, setLanguageFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [expandedId, setExpandedId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  const filtered = useMemo(() => {
    return hymns.filter((h) => {
      const q = search.toLowerCase()
      const matchesSearch =
        !q ||
        h.title.toLowerCase().includes(q) ||
        (h.titleTwi && h.titleTwi.toLowerCase().includes(q)) ||
        (h.author && h.author.toLowerCase().includes(q)) ||
        (h.verses[0] && h.verses[0].toLowerCase().includes(q))

      const matchesLang =
        languageFilter === 'All' || h.language === languageFilter.toLowerCase()

      const matchesCat =
        categoryFilter === 'All' || h.category === categoryFilter.toLowerCase()

      return matchesSearch && matchesLang && matchesCat
    })
  }, [search, languageFilter, categoryFilter])

  const copyLyrics = async (hymn) => {
    let text = `${hymn.title}\n`
    if (hymn.author) text += `by ${hymn.author}\n`
    text += '\n'
    hymn.verses.forEach((v, i) => {
      text += `Verse ${i + 1}:\n${v}\n\n`
      if (hymn.chorus && i === 0) {
        text += `Chorus:\n${hymn.chorus}\n\n`
      }
    })
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(hymn.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // fallback
    }
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What hymns are sung at funerals in Ghana?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Popular funeral hymns in Ghana include Abide With Me, Amazing Grace, Blessed Assurance, It Is Well With My Soul, Rock of Ages, The Lord Is My Shepherd, and Twi hymns such as Aseda, Onyame Ne Hene, and Yesu Ye Me Dea. These hymns provide comfort and worship during processional, committal, and recessional portions of funeral services.'
        }
      },
      {
        '@type': 'Question',
        name: 'What are common Twi funeral hymns?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Common Twi funeral hymns include Aseda (a thanksgiving hymn), Onyame Ne Hene (God Is King), Me Nyame Ye Kese (My God Is Great), Awurade Kasa (Speak Lord), and Yesu Ye Me Dea (Jesus Is Mine). These are widely sung in Akan-speaking communities during funerals across Ghana.'
        }
      },
      {
        '@type': 'Question',
        name: 'How do I choose hymns for a funeral programme?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Choose processional hymns like Onward Christian Soldiers for the entry, worship hymns like How Great Thou Art for the service, comfort hymns like Abide With Me during the tribute, committal hymns like Rock of Ages at the graveside, and recessional hymns like In the Sweet By and By for the closing. FuneralPress lets you add selected hymns directly to your funeral booklet.'
        }
      }
    ]
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="11,000+ Funeral Hymns — Lyrics & Song Library | FuneralPress"
        description="Find the perfect funeral hymns. Browse 11,000+ hymn lyrics including popular Ghanaian, Akan, Twi, and English funeral songs. Search by title or first line."
        path="/hymns"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      {/* Navbar */}
      <nav className="h-12 bg-background border-b border-border flex items-center justify-between px-4 shrink-0">
        <Link to="/" className="flex items-center gap-2 text-card-foreground hover:text-foreground transition-colors">
          <Music size={18} className="text-primary" />
          <span className="text-sm font-semibold tracking-wide">Hymn Library</span>
        </Link>
        <Link
          to="/booklet-editor"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <BookOpen size={14} />
          <span className="hidden sm:inline">Use in Booklet</span>
        </Link>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 pb-24 sm:pb-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Funeral Hymn Library
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
            Browse popular hymns for funeral services in Ghana. Find lyrics in English and Twi,
            organized by category. Copy lyrics directly or add them to your funeral booklet.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, author, or first line..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-lg pl-9 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-xs text-muted-foreground self-center mr-1">Language:</span>
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguageFilter(lang)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                languageFilter === lang
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-xs text-muted-foreground self-center mr-1">Category:</span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                categoryFilter === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-4">
          {filtered.length} hymn{filtered.length !== 1 ? 's' : ''} found
        </p>

        {/* Hymn Cards */}
        <div className="grid gap-3">
          {filtered.map((hymn) => {
            const isExpanded = expandedId === hymn.id
            const firstLine = hymn.verses[0]?.split('\n')[0] || ''

            return (
              <div
                key={hymn.id}
                className="bg-card border border-border rounded-lg overflow-hidden transition-all"
              >
                {/* Card Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : hymn.id)}
                  className="w-full text-left p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Music size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-semibold text-foreground">{hymn.title}</h2>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${languageBadgeColors[hymn.language]}`}>
                        {hymn.language}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded border bg-muted/50 text-muted-foreground border-border capitalize">
                        {categoryLabels[hymn.category]}
                      </span>
                    </div>
                    {hymn.author && (
                      <p className="text-xs text-muted-foreground mt-0.5">by {hymn.author}</p>
                    )}
                    {!isExpanded && (
                      <p className="text-xs text-muted-foreground/70 mt-1 truncate italic">
                        {firstLine}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-muted-foreground mt-1">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {/* Expanded Lyrics */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border">
                    <div className="pt-4 space-y-4">
                      {hymn.verses.map((verse, i) => (
                        <div key={i}>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                            Verse {i + 1}
                          </p>
                          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                            {verse}
                          </p>
                          {hymn.chorus && i === 0 && (
                            <div className="mt-3 pl-3 border-l-2 border-primary/40">
                              <p className="text-[10px] uppercase tracking-wider text-primary mb-1">
                                Chorus
                              </p>
                              <p className="text-sm text-foreground whitespace-pre-line leading-relaxed italic">
                                {hymn.chorus}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-5 pt-3 border-t border-border">
                      <button
                        onClick={() => copyLyrics(hymn)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                      >
                        {copiedId === hymn.id ? (
                          <>
                            <Check size={13} className="text-green-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            Copy Lyrics
                          </>
                        )}
                      </button>
                      <Link
                        to="/booklet-editor"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <BookOpen size={13} />
                        Use in Booklet
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Music size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No hymns match your search.</p>
            <button
              onClick={() => {
                setSearch('')
                setLanguageFilter('All')
                setCategoryFilter('All')
              }}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-12 bg-card border border-border rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Planning a funeral programme?
          </h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Add hymns directly to your funeral booklet with our free booklet editor. Choose a template, customize, and print.
          </p>
          <Link
            to="/booklet-editor"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <BookOpen size={16} />
            Start Designing Your Booklet
          </Link>
        </div>
      </div>
    </div>
  )
}
