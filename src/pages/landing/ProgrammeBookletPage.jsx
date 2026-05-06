import { useNavigate, Link } from 'react-router-dom'
import PageMeta from '../../components/seo/PageMeta'
import FAQSection from '../../components/seo/FAQSection'
import {
  ArrowRight,
  BookOpen,
  Music,
  FileText,
  Download,
  Layers,
  Sparkles,
  CheckCircle,
  ChevronRight,
  Clock,
} from 'lucide-react'

const features = [
  {
    icon: BookOpen,
    title: 'Order of Service Builder',
    desc: 'Drag-and-drop service sections: processional, opening prayer, hymns, tributes, sermon, committal, and recessional.',
  },
  {
    icon: Music,
    title: 'Hymn & Song Library',
    desc: 'Access a library of 200+ Ghanaian and international funeral hymns with full lyrics — no typing required.',
  },
  {
    icon: FileText,
    title: 'Biography & Tribute Sections',
    desc: 'Dedicated sections for the biographical sketch, messages from children, spouse, church, and workplace.',
  },
  {
    icon: Sparkles,
    title: 'AI Content Assist',
    desc: 'Use our AI writer to draft tribute paragraphs, biographical sketches, and closing messages in minutes.',
  },
  {
    icon: Layers,
    title: 'Multi-Page Booklet Layouts',
    desc: 'Design 4, 8, 12, or 16-page booklets. Covers, inside spreads, and back covers are all customisable.',
  },
  {
    icon: Download,
    title: 'Print-Ready Booklet PDF',
    desc: 'Export a printer-ready PDF with correct bleed, crop marks, and 300 DPI resolution for professional printing.',
  },
]

const faqs = [
  {
    question: 'What is a funeral programme booklet?',
    answer: 'A funeral programme booklet (also called an order of service booklet) is a printed guide distributed to guests at a funeral service. It outlines the sequence of events, includes hymns and scripture readings, contains the biographical sketch of the deceased, and features tribute messages from family members.',
  },
  {
    question: 'What sections should a funeral programme booklet include?',
    answer: 'A comprehensive funeral programme booklet typically includes: a cover with a portrait photo, order of service (processional, hymns, prayers, tributes, sermon, committal, recessional), biographical sketch, tribute messages from family and friends, hymn lyrics, and acknowledgements. FuneralPress templates include all of these sections.',
  },
  {
    question: 'How many pages is a funeral programme booklet?',
    answer: 'Most funeral programme booklets are 8 or 12 pages. FuneralPress supports 4, 8, 12, and 16-page layouts. The number of pages depends on the length of the order of service, the number of tributes, and the number of hymns included.',
  },
  {
    question: 'How much does a funeral programme booklet cost on FuneralPress?',
    answer: 'A single funeral programme booklet design costs GHS 35. A bundle of three design types costs GHS 75. The unlimited Suite plan costs GHS 120 and covers all FuneralPress design types including booklets, brochures, posters, and invitation cards.',
  },
  {
    question: 'What size is the funeral programme booklet?',
    answer: 'FuneralPress programme booklets are designed for A5 (148 × 210 mm) size, which is the standard for Ghanaian funeral programmes. The PDF export includes print-ready bleed marks and 300 DPI resolution.',
  },
  {
    question: 'Can I add hymn lyrics to the programme booklet?',
    answer: 'Yes. FuneralPress includes a searchable library of 200+ funeral hymns including Abide With Me, The Lord is My Shepherd, How Great Thou Art, Lead Kindly Light, and many Ghanaian and Twi-language hymns. Select a hymn and the full lyrics are added automatically.',
  },
  {
    question: 'Can I include an order of service for a church funeral?',
    answer: 'Yes. FuneralPress supports church funeral programmes including Anglican, Catholic, Methodist, Presbyterian, Pentecostal, and non-denominational orders of service. Each template is easily adapted to your church\'s specific format and liturgy.',
  },
  {
    question: 'Can I include an order of service for a graveside or outdoor funeral?',
    answer: 'Yes. Alongside church services, FuneralPress supports graveside committal programmes, celebration-of-life ceremonies, and traditional Ghanaian funeral rites. The order of service builder lets you add, remove, and reorder any sections.',
  },
  {
    question: 'How do I print the funeral programme booklet in Ghana?',
    answer: 'Download the print-ready PDF from FuneralPress, then take it to any printing shop in Ghana. Specify A5 booklet printing with a centre staple (saddle stitch). Most shops in Accra, Kumasi, and other cities can print same-day.',
  },
  {
    question: 'Can I use the AI writer to draft the biographical sketch?',
    answer: 'Yes. Enter the deceased\'s name, hometown, profession, family members, and a few key life events, and the AI writer will generate a polished biographical sketch that you can edit and personalise before publishing.',
  },
  {
    question: 'Is the funeral programme booklet different from a funeral brochure?',
    answer: 'Yes. A funeral brochure is typically a single folded sheet (A4 or A5) with a high-level overview — suitable for a simple service. A programme booklet is a multi-page saddle-stitched document that provides full details including complete hymn lyrics, multiple tributes, and a detailed biographical sketch. Many families create both.',
  },
]

const pricing = [
  { name: 'Single', price: 'GHS 35', desc: 'One programme booklet download', cta: 'Get Started', primary: false },
  { name: 'Bundle', price: 'GHS 75', desc: 'Booklet + brochure + poster', cta: 'Best Value', primary: true },
  { name: 'Suite', price: 'GHS 120', desc: 'All designs, unlimited downloads', cta: 'Go Unlimited', primary: false },
]

const templateNames = ['Classic', 'Heritage', 'Regal', 'Grace', 'Bloom', 'Serenity', 'Celestial', 'Ivory']

const serviceItems = [
  'Processional Hymn',
  'Opening Prayer',
  'Scripture Reading',
  'Biographical Sketch',
  'Tribute from Family',
  'Choir / Special Music',
  'Sermon / Homily',
  'Committal Rites',
  'Closing Hymn',
  'Acknowledgements',
]

export default function ProgrammeBookletPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Funeral Programme Booklet Designer — Order of Service | FuneralPress"
        description="Design a professional funeral programme booklet with order of service, hymn lyrics, tributes, and biographical sketch. Print-ready PDF. Starts at GHS 35."
        path="/funeral-programme-booklet"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Funeral Programme Booklet', path: '/funeral-programme-booklet' },
        ]}
        faqs={faqs}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 pt-6">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li><Link to="/" className="hover:text-foreground transition-colors">Home</Link></li>
          <li><ChevronRight className="w-3.5 h-3.5" /></li>
          <li className="text-foreground font-medium">Funeral Programme Booklet</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-10 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <Clock className="w-4 h-4" />
          Complete booklet designed in under 1 hour
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
          Funeral Programme Booklet Designer —<br className="hidden md:block" /> Order of Service
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
          Design a complete funeral programme booklet with order of service, full hymn lyrics,
          biographical sketch, and tribute messages. Download a print-ready A5 PDF for any
          church, graveside, or celebration-of-life service in Ghana.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/booklet-editor')}
            className="px-8 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
          >
            Design Your Booklet Free <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/funeral-booklet-templates')}
            className="px-8 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-card transition-colors"
          >
            Browse Templates
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-2 text-center">Built for Ghanaian Funeral Services</h2>
        <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
          Every feature is designed to make it easy to produce a dignified, comprehensive
          funeral programme booklet — even if you have never designed one before.
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

      {/* Order of Service Demo */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div>
            <h2 className="text-2xl font-semibold mb-3">Complete Order of Service</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Build your complete order of service by selecting from standard sections or creating
              custom ones. Drag and drop to reorder. Each section can be fully edited with your
              specific content.
            </p>
            <ul className="space-y-2">
              {serviceItems.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="text-center mb-4">
              <div className="w-16 h-20 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 mx-auto mb-3 flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-primary" />
              </div>
              <p className="font-semibold text-sm">Sample Programme Booklet</p>
              <p className="text-xs text-muted-foreground mt-1">A5 · 12 pages · Print-ready</p>
            </div>
            <div className="space-y-2">
              {serviceItems.slice(0, 6).map((item, i) => (
                <div key={item} className="flex items-center gap-3 text-sm py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground text-xs w-4">{i + 1}.</span>
                  <span className="text-foreground">{item}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-center pt-2">+ 4 more sections</p>
            </div>
          </div>
        </div>
      </section>

      {/* Template Preview */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-2 text-center">Professional Booklet Templates</h2>
        <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
          Choose from 8 professionally designed programme booklet covers, each available in 4, 8, 12, and 16-page versions.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {templateNames.map((name) => (
            <button
              key={name}
              onClick={() => navigate('/booklet-editor')}
              className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/40 transition-all text-left"
            >
              <div className="w-full h-32 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
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
          <Link to="/funeral-booklet-templates" className="text-primary hover:underline text-sm font-medium inline-flex items-center gap-1">
            See all booklet templates <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-2 text-center">Simple, Transparent Pricing</h2>
        <p className="text-muted-foreground text-center mb-10">Pay once, download your print-ready A5 booklet PDF. No subscriptions.</p>
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
                onClick={() => navigate('/booklet-editor')}
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
            Design Your Funeral Programme Booklet Today
          </h2>
          <p className="text-muted-foreground mb-8">
            Give your loved one's service the dignity it deserves. A complete, beautifully
            designed order of service booklet — ready for print in under an hour.
          </p>
          <button
            onClick={() => navigate('/booklet-editor')}
            className="px-8 py-3 rounded-xl bg-primary text-white font-semibold text-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            Start Designing <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
    </div>
  )
}
