import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { REGIONS } from '../data/regions'
import PageMeta from '../components/seo/PageMeta'
import FAQSection from '../components/seo/FAQSection'
import { ArrowRight, MapPin, Users, BookOpen, Star, CheckCircle, ChevronRight } from 'lucide-react'

function buildFAQs(region) {
  return [
    {
      question: `What funeral services are available in ${region.name}, Ghana?`,
      answer: `FuneralPress provides digital funeral design services across ${region.name} region, including funeral brochures, obituary posters, memorial pages, programme booklets, invitation cards, and thank-you cards. All designs can be downloaded as print-ready PDFs or shared digitally.`,
    },
    {
      question: `How much does a funeral brochure cost in ${region.name}?`,
      answer: `A single funeral brochure design costs GHS 35. You can also purchase a bundle of 3 designs for GHS 75, or unlimited designs for GHS 120. All prices include a print-ready PDF download.`,
    },
    {
      question: `Can I design a funeral programme booklet for a service in ${region.capital}?`,
      answer: `Yes. FuneralPress lets you create professional funeral programme booklets (order of service) that are perfect for church services, graveside ceremonies, and celebration-of-life events throughout ${region.name} region including ${region.capital}.`,
    },
    {
      question: `What cultural traditions should I consider for a funeral in ${region.name}?`,
      answer: `${region.culturalNote} FuneralPress offers Ghanaian-inspired design templates that incorporate Adinkra symbols, kente patterns, and culturally appropriate colour palettes to honour these traditions.`,
    },
    {
      question: `How do I create an online obituary for someone from ${region.name}?`,
      answer: `Use FuneralPress to create a personalised obituary page. Add photos, a tribute, a virtual guest book, and share the link with family and friends anywhere in Ghana or abroad. The page is hosted permanently and accessible on any device.`,
    },
    {
      question: `Are there funeral venues listed for ${region.name} on FuneralPress?`,
      answer: `We are building a verified funeral venue directory for ${region.name} region including churches, community centres, and funeral parlours in ${region.capital} and surrounding areas. Venue listings are coming soon.`,
    },
    {
      question: `Can I print funeral materials in ${region.capital}?`,
      answer: `Yes. All FuneralPress designs export as high-resolution, print-ready PDFs that any printing shop in ${region.capital} or across ${region.name} region can print. We also offer a print-and-deliver service to selected locations.`,
    },
    {
      question: `How quickly can I get a funeral brochure designed for a service in ${region.name}?`,
      answer: `Most families complete their funeral brochure design within 30 minutes using FuneralPress. Simply choose a template, upload a photo, add the details, and download your PDF immediately after payment.`,
    },
    {
      question: `Does FuneralPress support Ghanaian languages for funeral materials in ${region.name}?`,
      answer: `You can type any content in your preferred language, including Twi, Ga, Ewe, Dagbani, and other Ghanaian languages. The designer supports all Unicode characters, so tributes, hymns, and service programmes can be written in the language of your community.`,
    },
    {
      question: `Can I create a memorial slideshow for a funeral in ${region.name}?`,
      answer: `Yes. FuneralPress includes a memorial slideshow feature that lets you compile photos and music into a dignified tribute slideshow suitable for display at the funeral venue or shared online with relatives who cannot attend in person.`,
    },
  ]
}

export default function RegionPage() {
  const { region: slug } = useParams()
  const navigate = useNavigate()
  const region = REGIONS.find((r) => r.slug === slug)

  const [venues, setVenues] = useState([])
  const [venuesLoading, setVenuesLoading] = useState(true)

  useEffect(() => {
    if (!region) return
    const controller = new AbortController()
    async function loadVenues() {
      setVenuesLoading(true)
      try {
        const r = await fetch(`/api/venues?region=${slug}&verified=1`, { signal: controller.signal })
        const data = await r.json()
        setVenues(Array.isArray(data) ? data : [])
      } catch {
        if (!controller.signal.aborted) setVenues([])
      } finally {
        if (!controller.signal.aborted) setVenuesLoading(false)
      }
    }
    loadVenues()
    return () => controller.abort()
  }, [slug, region])

  if (!region) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Region Not Found</h1>
          <p className="text-muted-foreground">We couldn't find the region you're looking for.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline">
            Go Home <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  const faqs = buildFAQs(region)

  const services = [
    { icon: BookOpen, title: 'Funeral Brochures', desc: 'Professionally designed A4 and A5 brochures with photo layouts, tributes, and order of service.' },
    { icon: Star, title: 'Obituary Posters', desc: 'Eye-catching A3 memorial posters with bold typography and cultural design elements.' },
    { icon: CheckCircle, title: 'Programme Booklets', desc: 'Detailed order of service booklets for church, graveside, and celebration-of-life services.' },
    { icon: Users, title: 'Online Memorial Pages', desc: 'Permanent tribute pages with virtual guest books, photo galleries, and shareable links.' },
    { icon: MapPin, title: 'Invitation Cards', desc: 'Elegant digital and print-ready funeral and one-week celebration invitation cards.' },
    { icon: ArrowRight, title: 'Thank-You Cards', desc: 'Heartfelt thank-you cards to acknowledge the support of family, friends, and community members.' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title={`Funeral Services in ${region.name}, Ghana — FuneralPress`}
        description={`Design professional funeral brochures, obituary posters, and memorial pages for services in ${region.name}, Ghana. Trusted by families across ${region.capital} and surrounding areas.`}
        path={`/funeral-services/${region.slug}`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Funeral Services', path: '/funeral-services' },
          { name: region.name, path: `/funeral-services/${region.slug}` },
        ]}
        faqs={faqs}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 pt-6">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li><Link to="/" className="hover:text-foreground transition-colors">Home</Link></li>
          <li><ChevronRight className="w-3.5 h-3.5" /></li>
          <li><span>Funeral Services</span></li>
          <li><ChevronRight className="w-3.5 h-3.5" /></li>
          <li className="text-foreground font-medium">{region.name}</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-10 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <MapPin className="w-4 h-4" />
          {region.capital}, Ghana
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
          Funeral Services in {region.name}, Ghana
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
          Create beautiful, dignified funeral materials for families across {region.name} region.
          FuneralPress provides professional design tools trusted by bereaved families in {region.capital} and beyond.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/themes')}
            className="px-8 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
          >
            Start Designing <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/editor')}
            className="px-8 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-card transition-colors"
          >
            View Templates
          </button>
        </div>
      </section>

      {/* Cultural Traditions */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="bg-card border border-border rounded-2xl p-8">
          <h2 className="text-xl font-semibold mb-3">Funeral Traditions in {region.name}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {region.culturalNote} FuneralPress designs honour these rich traditions with
            culturally inspired templates featuring Adinkra symbols, kente patterns, and the warm
            colour palettes that reflect {region.name}'s heritage. Whether you are planning a traditional
            funeral, a church service, or a modern celebration of life, our tools help you create
            materials that truly reflect the life of your loved one.
          </p>
        </div>
      </section>

      {/* Services Section */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-2 text-center">
          What FuneralPress Offers in {region.name}
        </h2>
        <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
          Everything you need to honour your loved one, designed in minutes and available across {region.name} region.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map(({ icon: Icon, title, desc }) => (
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

      {/* Venue Directory */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-2 text-center">
          Funeral Venues in {region.name}
        </h2>
        <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
          Verified churches, community centres, and funeral parlours across {region.name} region.
        </p>
        {venuesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : venues.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {venues.map((venue) => (
              <div key={venue.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all">
                <h3 className="font-semibold mb-1">{venue.name}</h3>
                <p className="text-muted-foreground text-sm">{venue.address}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border border-dashed rounded-2xl p-12 text-center">
            <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Venue Directory Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              We are compiling a verified list of funeral venues, churches, and memorial halls across {region.name} region.
              Check back soon or <Link to="/venues" className="text-primary hover:underline">browse all venues</Link>.
            </p>
          </div>
        )}
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-8 text-center">
          Frequently Asked Questions — Funeral Services in {region.name}
        </h2>
        <FAQSection faqs={faqs} />
      </section>

      {/* CTA */}
      <section className="bg-card border-t border-border">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Design a Beautiful Tribute for Your Loved One
          </h2>
          <p className="text-muted-foreground mb-8">
            Families across {region.name} region use FuneralPress to create professional funeral materials
            in minutes. Start with a template, personalise it, and download your print-ready design today.
          </p>
          <button
            onClick={() => navigate('/themes')}
            className="px-8 py-3 rounded-xl bg-primary text-white font-semibold text-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            Browse Templates <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
    </div>
  )
}
