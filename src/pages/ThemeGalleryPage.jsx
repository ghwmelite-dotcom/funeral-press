import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageMeta from '../components/seo/PageMeta'
import { ArrowLeft, Palette } from 'lucide-react'
import { themes, themeCategories } from '../utils/themes'
import { useBrochureStore } from '../stores/brochureStore'
import ThemePreviewCard from '../components/landing/ThemePreviewCard'

export default function ThemeGalleryPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const navigate = useNavigate()
  const store = useBrochureStore()

  const filteredThemes = Object.entries(themes).filter(
    ([, t]) => activeCategory === 'all' || t.category === activeCategory
  )

  const handleThemeSelect = (themeKey) => {
    store.newBrochure()
    store.updateField('theme', themeKey)
    navigate('/editor')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Funeral Design Templates — Brochures, Posters & More | FuneralPress"
        description="Browse 100+ professionally designed funeral templates. Brochures, posters, invitations, booklets, and memorial cards. Customise instantly for your loved one."
        path="/themes"
      />
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1
              className="text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Theme Gallery
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a theme to start your brochure
            </p>
          </div>
        </div>

        {/* Category filter tabs */}
        <div className="flex items-center gap-2 mb-8">
          {Object.entries(themeCategories).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                activeCategory === key
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Themes grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredThemes.map(([key]) => (
            <ThemePreviewCard
              key={key}
              themeKey={key}
              onClick={() => handleThemeSelect(key)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
