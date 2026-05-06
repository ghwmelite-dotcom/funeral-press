import { useNavigate } from 'react-router-dom'
import PageMeta from '../../components/seo/PageMeta'
import FAQSection from '../../components/seo/FAQSection'
import { ArrowRight } from 'lucide-react'

const templates = [
  { name: 'Grace', description: 'A soft, graceful design with flowing lines and muted tones. Perfect for a dignified and understated tribute.' },
  { name: 'Heritage', description: 'Rich, traditional patterns inspired by Ghanaian heritage cloth. Ideal for honouring cultural roots and legacy.' },
  { name: 'Serenity', description: 'Calm blues and whites evoking peace and tranquillity. A serene layout for a gentle farewell.' },
  { name: 'Regal', description: 'Bold gold accents on deep backgrounds. A stately, distinguished design for a life of significance.' },
  { name: 'Bloom', description: 'Lush floral arrangements framing photos and text. A warm, natural design celebrating a beautiful life.' },
  { name: 'Ivory', description: 'Clean, minimalist ivory and cream tones. An elegant, timeless template that lets the content speak.' },
  { name: 'Dusk', description: 'Warm sunset gradients with gentle overlays. A reflective, contemplative design for evening memorial services.' },
  { name: 'Celestial', description: 'Starlit motifs and heavenly imagery. A comforting template for those who find peace in faith and the skies.' },
  { name: 'Ember', description: 'Warm amber and burgundy tones with textured backgrounds. A heartfelt design radiating warmth and love.' },
  { name: 'Horizon', description: 'Expansive landscape-inspired layouts with horizon lines. Symbolises hope and the journey beyond.' },
  { name: 'Classic', description: 'A timeless black-and-white design with serif typography. Formal, respectful, and universally appropriate.' },
]

const faqs = [
  {
    question: 'How do I design a funeral brochure?',
    answer: 'Choose a template, add the deceased\'s photo and details, write or use AI to generate a tribute, then download as a print-ready PDF.',
  },
  {
    question: 'Can I print my funeral brochure?',
    answer: 'Yes, you can download a high-quality PDF and print at any printing shop, or use our integrated print service for doorstep delivery in Ghana.',
  },
  {
    question: 'How much does a funeral brochure cost on FuneralPress?',
    answer: 'A single brochure design costs GHS 35. Bundle packs of 3 designs cost GHS 75, and unlimited designs cost GHS 120.',
  },
]


export default function FuneralBrochureTemplatesPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Funeral Brochure Templates — Design & Download Free | FuneralPress"
        description="Choose from beautifully designed funeral brochure templates. Customise with photos, hymns, and tributes. Download as PDF or share digitally. Start free."
        path="/funeral-brochure-templates"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Funeral Brochure Templates', path: '/funeral-brochure-templates' },
        ]}
        faqs={faqs}
      />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-16 pb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Funeral Brochure Templates
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Designing a funeral brochure in Ghana has never been easier. FuneralPress offers 11 professionally crafted templates
          that honour your loved one with elegance and dignity. Each template includes photo layouts, tribute sections, an order
          of service panel, and is fully customisable — no design skills required. Simply pick a theme, add your details, and
          download a print-ready PDF in minutes.
        </p>
      </section>

      {/* Template Grid */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-8 text-center">Choose Your Template</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((t) => (
            <div
              key={t.name}
              className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between hover:shadow-lg hover:border-primary/40 transition-all"
            >
              <div>
                <div className="w-full h-40 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4">
                  <span className="text-primary font-semibold text-lg">{t.name}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{t.name} Theme</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{t.description}</p>
              </div>
              <button
                onClick={() => navigate('/editor')}
                className="mt-4 w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                Use This Template <ArrowRight className="w-4 h-4" />
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
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to create a beautiful tribute?</h2>
          <p className="text-muted-foreground mb-8">
            Choose a template, personalise it with photos and text, and download your print-ready funeral brochure in minutes.
          </p>
          <button
            onClick={() => navigate('/editor')}
            className="px-8 py-3 rounded-xl bg-primary text-white font-semibold text-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            Start Designing <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
    </div>
  )
}
