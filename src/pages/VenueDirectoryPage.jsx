import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import PageMeta from '../components/seo/PageMeta'
import { Search, MapPin, Phone, Church, Building2, TreePine, Users, X, Pencil } from 'lucide-react'
import venues from '../data/venues'

const CITIES = ['All', 'Accra', 'Kumasi', 'Takoradi', 'Cape Coast', 'Tamale', 'Tema']
const TYPES = [
  { key: 'All', label: 'All Types' },
  { key: 'church', label: 'Churches' },
  { key: 'mortuary', label: 'Mortuaries' },
  { key: 'funeral_grounds', label: 'Funeral Grounds' },
  { key: 'community_center', label: 'Community Centres' }
]

const typeIcons = {
  church: Church,
  mortuary: Building2,
  funeral_grounds: TreePine,
  community_center: Users
}

const typeBadgeColors = {
  church: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  mortuary: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  funeral_grounds: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  community_center: 'bg-sky-500/15 text-sky-400 border-sky-500/30'
}

const typeLabels = {
  church: 'Church',
  mortuary: 'Mortuary',
  funeral_grounds: 'Funeral Grounds',
  community_center: 'Community Centre'
}

export default function VenueDirectoryPage() {
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')

  const filtered = useMemo(() => {
    return venues.filter((v) => {
      const q = search.toLowerCase()
      const matchesSearch =
        !q ||
        v.name.toLowerCase().includes(q) ||
        v.address.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)

      const matchesCity = cityFilter === 'All' || v.city === cityFilter
      const matchesType = typeFilter === 'All' || v.type === typeFilter

      return matchesSearch && matchesCity && matchesType
    })
  }, [search, cityFilter, typeFilter])

  // Group by city
  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach((v) => {
      if (!groups[v.city]) groups[v.city] = []
      groups[v.city].push(v)
    })
    // Sort cities by count descending
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
  }, [filtered])

  // JSON-LD for top venues
  const topVenues = venues.slice(0, 8)
  const localBusinessSchema = topVenues.map((v) => ({
    '@context': 'https://schema.org',
    '@type': v.type === 'church' ? 'PlaceOfWorship' : 'LocalBusiness',
    name: v.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: v.address,
      addressLocality: v.city,
      addressRegion: v.region,
      addressCountry: 'GH'
    },
    ...(v.phone ? { telephone: v.phone } : {}),
    description: v.description
  }))

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Funeral Venues Directory Ghana — Find Grounds & Halls | FuneralPress"
        description="Search funeral venues across Ghana. Browse funeral grounds, church halls, and reception venues in Accra, Kumasi, Takoradi, and more. Contact details included."
        path="/venues"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(localBusinessSchema)}</script>
      </Helmet>

      {/* Navbar */}
      <nav className="h-12 bg-background border-b border-border flex items-center justify-between px-4 shrink-0">
        <Link to="/" className="flex items-center gap-2 text-card-foreground hover:text-foreground transition-colors">
          <MapPin size={18} className="text-primary" />
          <span className="text-sm font-semibold tracking-wide">Venue Directory</span>
        </Link>
        <Link
          to="/editor"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Pencil size={14} />
          <span className="hidden sm:inline">Design Brochure</span>
        </Link>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 pb-24 sm:pb-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Funeral Venues in Ghana
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
            Find churches, mortuaries, funeral grounds, and community centres across Ghana for funeral
            services, wake-keepings, and memorial ceremonies.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by venue name, address, or description..."
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
          <span className="text-xs text-muted-foreground self-center mr-1">City:</span>
          {CITIES.map((city) => (
            <button
              key={city}
              onClick={() => setCityFilter(city)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                cityFilter === city
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-xs text-muted-foreground self-center mr-1">Type:</span>
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                typeFilter === t.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-4">
          {filtered.length} venue{filtered.length !== 1 ? 's' : ''} found
        </p>

        {/* Grouped Venue Cards */}
        {grouped.map(([city, cityVenues]) => (
          <div key={city} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={14} className="text-primary" />
              <h2 className="text-base font-semibold text-foreground">{city}</h2>
              <span className="text-xs text-muted-foreground">({cityVenues.length})</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {cityVenues.map((venue) => {
                const Icon = typeIcons[venue.type] || Building2

                return (
                  <div
                    key={venue.id}
                    className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-foreground">{venue.name}</h3>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${typeBadgeColors[venue.type]}`}>
                            {typeLabels[venue.type]}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                          <MapPin size={11} className="shrink-0" />
                          <span className="truncate">{venue.address}</span>
                        </div>

                        {venue.phone && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Phone size={11} className="shrink-0" />
                            <a
                              href={`tel:${venue.phone}`}
                              className="text-primary hover:underline"
                            >
                              {venue.phone}
                            </a>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">
                          {venue.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <MapPin size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No venues match your search.</p>
            <button
              onClick={() => {
                setSearch('')
                setCityFilter('All')
                setTypeFilter('All')
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
            Planning a funeral?
          </h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Start designing your funeral brochure with our free editor. Choose a beautiful template, add details, and print or share digitally.
          </p>
          <Link
            to="/editor"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Pencil size={16} />
            Start Designing Your Brochure
          </Link>
        </div>
      </div>
    </div>
  )
}
