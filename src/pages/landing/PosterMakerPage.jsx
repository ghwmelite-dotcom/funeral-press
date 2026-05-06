import { useNavigate, Link } from 'react-router-dom'
import PageMeta from '../../components/seo/PageMeta'
import FAQSection from '../../components/seo/FAQSection'
import {
  ArrowRight,
  Image,
  Type,
  Palette,
  Download,
  ZoomIn,
  Share2,
  CheckCircle,
  ChevronRight,
} from 'lucide-react'

const features = [
  {
    icon: Image,
    title: 'Portrait-First Layouts',
    desc: 'Beautifully centred portrait designs with bold name typography. Perfect for display at funeral venues, churches, and community centres.',
  },
  {
    icon: Type,
    title: 'Elegant Typography',
    desc: 'Choose from serif, sans-serif, and decorative typefaces that convey dignity and respect. All fonts are print-optimised.',
  },
  {
    icon: Palette,
    title: 'Cultural Colour Palettes',
    desc: 'Traditional Ghanaian black and gold, soft pastels, and deep royal tones — each palette is curated for funeral contexts.',
  },
  {
    icon: Download,
    title: 'A3 Print-Ready Export',
    desc: 'Download your poster as a 300 DPI PDF in A3 size, ideal for printing at any shop across Ghana.',
  },
  {
    icon: ZoomIn,
    title: 'Adinkra & Cultural Elements',
    desc: 'Embed authentic Adinkra symbols and kente-inspired decorative borders to honour Ghanaian heritage and tradition.',
  },
  {
    icon: Share2,
    title: 'Share Digitally',
    desc: 'Share your obituary poster on WhatsApp, Facebook, or email as a high-quality image — reaching family wherever they are.',
  },
]

const faqs = [
  {
    question: 'What is a funeral poster?',
    answer: 'A funeral poster (also called an obituary poster or memorial poster) is a large-format printed display featuring the deceased\'s photo, name, date of birth, date of death, and a brief tribute. It is typically displayed at the funeral venue entrance, church, or community centre.',
  },
  {
    question: 'How do I create a funeral poster on FuneralPress?',
    answer: 'Select a poster template, upload a portrait photo of your loved one, fill in the name, dates, and a brief tribute, choose your preferred colour palette and Adinkra symbols, then download the finished A3 PDF.',
  },
  {
    question: 'What size is a funeral poster?',
    answer: 'FuneralPress funeral posters are designed for A3 (297 × 420 mm) printing, which is the standard size used by printing shops across Ghana. The export is 300 DPI for professional print quality.',
  },
  {
    question: 'How much does a funeral poster cost?',
    answer: 'A single funeral poster costs GHS 35. A bundle including a poster, brochure, and invitation costs GHS 75. The Suite plan at GHS 120 covers all design types with unlimited downloads.',
  },
  {
    question: 'Can I include Adinkra symbols on the poster?',
    answer: 'Yes. FuneralPress offers a selection of Adinkra symbols commonly used in Ghanaian funeral contexts, including Sankofa (return and learn from the past), Gye Nyame (supremacy of God), and Nyame Biribi Wo Soro (God is in the heavens).',
  },
  {
    question: 'How many photos can I add to a funeral poster?',
    answer: 'Most funeral poster templates feature one large portrait photo. Some layouts support a second smaller photo for a couple or to show the deceased at a significant life moment. Multi-photo collage layouts are also available.',
  },
  {
    question: 'Can I print the funeral poster at a local shop in Ghana?',
    answer: 'Yes. The downloaded PDF is print-ready at any printing shop in Ghana. Just hand them the PDF file and specify A3 printing. Most print shops in Accra, Kumasi, and other cities offer same-day printing.',
  },
  {
    question: 'Can I share the funeral poster digitally on WhatsApp?',
    answer: 'Yes. Along with the PDF, FuneralPress provides a high-resolution JPEG version optimised for WhatsApp and social media sharing, so family and friends everywhere can receive the announcement.',
  },
  {
    question: 'What languages can I use on the funeral poster?',
    answer: 'You can write in any language including Twi, Ga, Ewe, Hausa, Dagbani, or English. Our poster designer supports all Unicode text, so you can write the name, tribute, and dates in your preferred language.',
  },
  {
    question: 'How long does it take to design a funeral poster?',
    answer: 'Most families complete their funeral poster design within 15 to 20 minutes. The pre-built layouts mean you only need to add the photo, name, dates, and a short tribute — the design does the rest.',
  },
  {
    question: 'Is there a difference between an obituary poster and a funeral brochure?',
    answer: 'Yes. An obituary poster is a single large-format display (A3) placed at the venue, while a funeral brochure is a smaller folded document (A4 or A5) given to each guest. FuneralPress offers both, and the Bundle plan covers both designs at a discounted price.',
  },
]

const pricing = [
  { name: 'Single', price: 'GHS 35', desc: 'One poster design download', cta: 'Get Started', primary: false },
  { name: 'Bundle', price: 'GHS 75', desc: 'Poster + brochure + invitation', cta: 'Best Value', primary: true },
  { name: 'Suite', price: 'GHS 120', desc: 'All designs, unlimited downloads', cta: 'Go Unlimited', primary: false },
]

const templateNames = ['Heritage', 'Regal', 'Celestial', 'Ember', 'Classic', 'Dusk', 'Serenity', 'Bloom']

export default function PosterMakerPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Funeral Poster Maker — Design Elegant Obituary Posters | FuneralPress"
        description="Create professional funeral and obituary posters online with FuneralPress. A3 print-ready PDFs with Adinkra symbols and Ghanaian cultural designs. Starts at GHS 35."
        path="/funeral-poster-maker"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Funeral Poster Maker', path: '/funeral-poster-maker' },
        ]}
        faqs={faqs}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 pt-6">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li><Link to="/" className="hover:text-foreground transition-colors">Home</Link></li>
          <li><ChevronRight className="w-3.5 h-3.5" /></li>
          <li className="text-foreground font-medium">Funeral Poster Maker</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-10 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <CheckCircle className="w-4 h-4" />
          Print-ready in minutes
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
          Funeral Poster Maker —<br className="hidden md:block" /> Design Elegant Obituary Posters
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
          Create a dignified A3 funeral poster in minutes. Choose from culturally inspired templates,
          add a portrait photo, select Adinkra symbols, and download a print-ready PDF for any
          printing shop across Ghana.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/poster-editor')}
            className="px-8 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
          >
            Design Your Poster Free <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/funeral-poster-templates')}
            className="px-8 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-card transition-colors"
          >
            Browse Templates
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-2 text-center">Designed for Ghanaian Funerals</h2>
        <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
          Every feature is built with Ghanaian funeral traditions in mind — from Adinkra symbol libraries to
          culturally appropriate colour palettes.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Template Preview */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-2 text-center">Professional Poster Templates</h2>
        <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
          Each template is crafted by professional designers and optimised for A3 print and digital sharing.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {templateNames.map((name) => (
            <button
              key={name}
              onClick={() => navigate('/poster-editor')}
              className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/40 transition-all text-left"
            >
              <div className="w-full h-36 bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                <span className="text-primary font-semibold text-sm group-hover:scale-105 transition-transform">{name}</span>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium">{name} Theme</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tap to use</p>
              </div>
            </button>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link to="/funeral-poster-templates" className="text-primary hover:underline text-sm font-medium inline-flex items-center gap-1">
            See all poster templates <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-2 text-center">Simple, Transparent Pricing</h2>
        <p className="text-muted-foreground text-center mb-10">Pay once, download your A3 print-ready PDF instantly. No subscriptions.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {pricing.map(({ name, price, desc, cta, primary }) => (
            <div
              key={name}
              className={`rounded-2xl p-7 border flex flex-col items-center text-center transition-all ${
                primary
                  ? 'bg-primary text-white border-primary shadow-lg scale-105'
                  : 'bg-card border-border hover:shadow-md'
              }`}
            >
              <p className={`text-sm font-medium mb-1 ${primary ? 'text-white/70' : 'text-muted-foreground'}`}>{name}</p>
              <p className={`text-3xl font-bold mb-2 ${primary ? 'text-white' : 'text-foreground'}`}>{price}</p>
              <p className={`text-sm mb-6 ${primary ? 'text-white/80' : 'text-muted-foreground'}`}>{desc}</p>
              <button
                onClick={() => navigate('/poster-editor')}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  primary
                    ? 'bg-white text-primary hover:bg-white/90'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                {cta}
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

      {/* CTA */}
      <section className="bg-card border-t border-border">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Create a Dignified Obituary Poster Today
          </h2>
          <p className="text-muted-foreground mb-8">
            Honour your loved one with a beautiful, professionally designed funeral poster.
            Download your print-ready A3 PDF in minutes.
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
