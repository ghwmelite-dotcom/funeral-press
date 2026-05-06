import { useNavigate } from 'react-router-dom'
import PageMeta from '../../components/seo/PageMeta'
import FAQSection from '../../components/seo/FAQSection'
import { ArrowRight } from 'lucide-react'

const posterStyles = [
  { name: 'Tribute Portrait', description: 'A large centred portrait with bold name typography and key dates. The most popular format for Ghanaian death announcements.' },
  { name: 'Dual Photo', description: 'Side-by-side or before-and-after photo layout. Ideal for showcasing the deceased in different stages of life.' },
  { name: 'Full Bleed', description: 'Edge-to-edge photo coverage with elegant text overlays. A modern, striking design for maximum visual impact.' },
  { name: 'Classic Bordered', description: 'Ornamental border framing with a formal layout. Traditional and dignified for church and community notice boards.' },
  { name: 'Floral Frame', description: 'Beautiful floral wreath surrounding the portrait. A warm, natural aesthetic that conveys love and remembrance.' },
  { name: 'Gold Accent', description: 'Warm gold (#C9A84C) embellishments on a dark background. A regal, distinguished poster style for prominent figures.' },
  { name: 'Minimalist', description: 'Clean white space with restrained typography. An understated, elegant announcement that commands quiet attention.' },
  { name: 'Church Announcement', description: 'Formatted for church bulletin boards with service details, hymn numbers, and denomination-specific elements.' },
  { name: 'Community Notice', description: 'Designed for public notice boards with large readable text, funeral schedule, and family contact information.' },
]

const faqs = [
  {
    question: 'What size are funeral posters?',
    answer: 'FuneralPress supports multiple poster sizes including A3 (297 x 420mm), A2 (420 x 594mm), and custom sizes. A3 is the most common size for funeral and death announcement posters in Ghana.',
  },
  {
    question: 'How do I create a death announcement poster?',
    answer: 'Select a poster template, upload a photo of the deceased, enter the name, dates, and funeral details, then customise colours and fonts. Download as a high-resolution PDF ready for printing.',
  },
  {
    question: 'Can I add multiple photos to a funeral poster?',
    answer: 'Yes. Several of our poster templates support multiple photos, including dual-photo layouts and collage-style designs. You can upload as many photos as the layout supports.',
  },
]


export default function FuneralPosterTemplatesPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Funeral Poster Templates — Create Stunning Designs | FuneralPress"
        description="Design funeral and burial posters online. Professional templates you can customise in minutes. Add photos, dates, venue details. Download high-quality PDF."
        path="/funeral-poster-templates"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Funeral Poster Templates', path: '/funeral-poster-templates' },
        ]}
        faqs={faqs}
      />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-16 pb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Funeral Poster Templates
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          In Ghana, funeral posters and death announcement posters are an essential part of honouring the deceased and informing
          the community. FuneralPress provides professionally designed poster templates in multiple sizes — from A3 notice-board
          announcements to large-format prints. Upload a photo, enter the funeral details, and produce a stunning obituary poster
          ready for printing within minutes. No graphic designer needed.
        </p>
      </section>

      {/* Poster Style Grid */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-8 text-center">Poster Styles & Layouts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posterStyles.map((s) => (
            <div
              key={s.name}
              className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between hover:shadow-lg hover:border-primary/40 transition-all"
            >
              <div>
                <div className="w-full h-40 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4">
                  <span className="text-primary font-semibold text-lg">{s.name}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{s.name}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.description}</p>
              </div>
              <button
                onClick={() => navigate('/poster-editor')}
                className="mt-4 w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                Use This Style <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-8 text-center">Frequently Asked Questions</h2>
        <FAQSection faqs={faqs} />
      </section>

      {/* Footer CTA */}
      <section className="bg-card border-t border-border">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Create a funeral poster in minutes</h2>
          <p className="text-muted-foreground mb-8">
            Choose a poster style, add a photo and funeral details, and download a high-resolution print-ready PDF.
          </p>
          <button
            onClick={() => navigate('/poster-editor')}
            className="px-8 py-3 rounded-xl bg-primary text-white font-semibold text-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            Start Designing <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
    </div>
  )
}
