import { useNavigate, Link } from 'react-router-dom'
import PageMeta from '../../components/seo/PageMeta'
import FAQSection from '../../components/seo/FAQSection'
import {
  ArrowRight,
  Image,
  FileText,
  Sparkles,
  Download,
  Smartphone,
  Share2,
  CheckCircle,
  ChevronRight,
} from 'lucide-react'

const features = [
  {
    icon: FileText,
    title: 'Professional Templates',
    desc: '11 beautifully crafted brochure templates covering traditional Ghanaian, modern, and faith-based funeral aesthetics.',
  },
  {
    icon: Image,
    title: 'Photo Integration',
    desc: 'Upload and position photos with our intuitive editor. Supports portrait, landscape, and multiple-photo layouts.',
  },
  {
    icon: Sparkles,
    title: 'AI Tribute Writer',
    desc: 'Generate a heartfelt tribute paragraph in seconds using our AI writer. Simply enter the name and a few details.',
  },
  {
    icon: Download,
    title: 'Print-Ready PDF',
    desc: 'Download your brochure as a high-resolution PDF ready for any printing shop in Ghana. A3, A4, and A5 sizes supported.',
  },
  {
    icon: Smartphone,
    title: 'Mobile-Friendly',
    desc: 'Design and edit from any device — phone, tablet, or desktop. Your work is saved automatically in the cloud.',
  },
  {
    icon: Share2,
    title: 'Instant Sharing',
    desc: 'Share a digital link of your funeral brochure with family and friends worldwide via WhatsApp, email, or social media.',
  },
]

const faqs = [
  {
    question: 'What is a funeral brochure?',
    answer: 'A funeral brochure (also called a funeral programme or memorial brochure) is a printed or digital document distributed at funeral services. It typically includes a photo of the deceased, their biography, the order of service, hymns or scripture readings, and a tribute from family members.',
  },
  {
    question: 'How do I design a funeral brochure on FuneralPress?',
    answer: 'Choose a brochure template, upload a photo of your loved one, fill in the personal details and tribute text, customise colours and fonts, then download your finished PDF. The whole process typically takes 20 to 30 minutes.',
  },
  {
    question: 'How much does a funeral brochure cost?',
    answer: 'A single funeral brochure design costs GHS 35. A bundle of 3 different design types (e.g. brochure, poster, and invitation) costs GHS 75. The unlimited Suite plan costs GHS 120 and covers all design types.',
  },
  {
    question: 'Can I print the funeral brochure myself?',
    answer: 'Yes. Every FuneralPress design exports as a print-ready PDF that any printing shop in Ghana can print. You can also use our integrated print service for doorstep delivery in selected regions.',
  },
  {
    question: 'What sizes are available for funeral brochures?',
    answer: 'FuneralPress supports A4 (standard single-fold), A5 (half-sheet), and tri-fold brochure sizes. Each template is optimised for professional print quality at 300 DPI.',
  },
  {
    question: 'Can I add Ghanaian cultural elements to my funeral brochure?',
    answer: 'Yes. Our templates include options to incorporate Adinkra symbols, kente-inspired borders, and culturally appropriate colour palettes such as black and gold, which is traditional in Ghanaian funerals.',
  },
  {
    question: 'How many photos can I include in a funeral brochure?',
    answer: 'Depending on the template, you can include between 1 and 6 photos. Some layouts feature a large main portrait with smaller family or life-event photos arranged in a collage.',
  },
  {
    question: 'Can I edit my brochure after I have paid?',
    answer: 'Yes. Your design is saved to your FuneralPress account and can be edited at any time. You can download an updated PDF as often as needed without paying again.',
  },
  {
    question: 'Does FuneralPress support languages other than English?',
    answer: 'You can type content in any language including Twi, Ga, Ewe, Dagbani, Hausa, and French. Our editor supports all Unicode text, so tributes and service orders can be written in the language of your family and community.',
  },
  {
    question: 'How long does it take to create a funeral brochure?',
    answer: 'Most users complete their funeral brochure design within 20 to 30 minutes using FuneralPress. The AI tribute writer and pre-built order-of-service sections significantly reduce the time needed compared to designing from scratch.',
  },
  {
    question: 'Is there a free trial available?',
    answer: 'You can browse all templates and build your design for free before paying. Payment is only required when you are ready to download the final print-ready PDF.',
  },
]

const pricing = [
  { name: 'Single', price: 'GHS 35', desc: 'One brochure design download', cta: 'Get Started', primary: false },
  { name: 'Bundle', price: 'GHS 75', desc: 'Brochure + poster + invitation', cta: 'Best Value', primary: true },
  { name: 'Suite', price: 'GHS 120', desc: 'All designs, unlimited downloads', cta: 'Go Unlimited', primary: false },
]

export default function BrochureDesignerPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Funeral Brochure Designer — Create Beautiful Memorial Brochures | FuneralPress"
        description="Design professional funeral brochures online with FuneralPress. Choose from 11 templates, add photos and tributes, and download a print-ready PDF. Starts at GHS 35."
        path="/funeral-brochure-designer"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Funeral Brochure Designer', path: '/funeral-brochure-designer' },
        ]}
        faqs={faqs}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 pt-6">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li><Link to="/" className="hover:text-foreground transition-colors">Home</Link></li>
          <li><ChevronRight className="w-3.5 h-3.5" /></li>
          <li className="text-foreground font-medium">Funeral Brochure Designer</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-10 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <CheckCircle className="w-4 h-4" />
          Trusted by families across Ghana
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
          Funeral Brochure Designer —<br className="hidden md:block" /> Create Beautiful Memorial Brochures
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
          Design a professional, print-ready funeral brochure in under 30 minutes.
          Choose from 11 culturally inspired templates, add your loved one's photo and tribute,
          and download a high-quality PDF ready for any printing shop in Ghana.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/editor')}
            className="px-8 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
          >
            Start Designing Free <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/funeral-brochure-templates')}
            className="px-8 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-card transition-colors"
          >
            Browse Templates
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-2 text-center">Everything You Need in One Place</h2>
        <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
          FuneralPress combines professional design tools with Ghanaian cultural expertise so you can
          focus on what matters — honouring your loved one.
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

      {/* Template Preview Placeholder */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-2 text-center">11 Professional Brochure Templates</h2>
        <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
          From traditional Ghanaian designs to modern minimalist layouts — every template is print-ready at 300 DPI.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {['Grace', 'Heritage', 'Serenity', 'Regal', 'Bloom', 'Ivory', 'Dusk', 'Celestial'].map((name) => (
            <button
              key={name}
              onClick={() => navigate('/editor')}
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
          <Link to="/funeral-brochure-templates" className="text-primary hover:underline text-sm font-medium inline-flex items-center gap-1">
            See all 11 templates <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-2 text-center">Simple, Transparent Pricing</h2>
        <p className="text-muted-foreground text-center mb-10">Pay once, download your print-ready PDF. No subscriptions.</p>
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
                onClick={() => navigate('/editor')}
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
            Create a Beautiful Memorial Brochure Today
          </h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of Ghanaian families who have used FuneralPress to honour their loved ones
            with dignified, professionally designed funeral materials.
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
