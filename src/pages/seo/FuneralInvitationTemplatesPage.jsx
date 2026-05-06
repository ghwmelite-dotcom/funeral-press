import { useNavigate } from 'react-router-dom'
import PageMeta from '../../components/seo/PageMeta'
import FAQSection from '../../components/seo/FAQSection'
import { ArrowRight } from 'lucide-react'

const invitationStyles = [
  { name: 'Formal Elegance', description: 'A refined, serif-driven design with gold accents. Perfect for formal funeral and thanksgiving service invitations.' },
  { name: 'Floral Tribute', description: 'Delicate floral borders with soft pastel tones. A warm and gentle invitation for memorial gatherings.' },
  { name: 'Heritage Kente', description: 'Inspired by traditional Ghanaian Kente patterns. Celebrate cultural identity with a beautifully woven border design.' },
  { name: 'Marble & Gold', description: 'Luxurious marble texture with gold foil typography. An upscale invitation for distinguished memorial services.' },
  { name: 'Peaceful Garden', description: 'Nature-inspired with botanical illustrations. Evokes a sense of peace and natural beauty.' },
  { name: 'One-Week Celebration', description: 'Specially formatted for one-week observance invitations with programme schedule and family details.' },
  { name: 'Thanksgiving Service', description: 'Designed for post-funeral thanksgiving services with church details, hymn selections, and gratitude messaging.' },
  { name: 'Memorial Gathering', description: 'A modern, clean layout for intimate memorial gatherings. Includes venue map and RSVP details.' },
  { name: 'Photo Card', description: 'Large photo-centred design with the deceased\'s portrait as the focal point. Personal and heartfelt.' },
]

const faqs = [
  {
    question: 'What is a funeral invitation card?',
    answer: 'A funeral invitation card is a formal notice sent to family, friends, and community members inviting them to attend a funeral service, thanksgiving service, one-week celebration, or memorial gathering. In Ghanaian culture, these invitations are an important part of funeral planning and carry significant respect.',
  },
  {
    question: 'When should I send funeral invitations?',
    answer: 'Funeral invitations should ideally be sent 1 to 2 weeks before the funeral date. For one-week celebrations and thanksgiving services, invitations are typically distributed immediately after the burial. Digital invitations via WhatsApp can be shared instantly using FuneralPress.',
  },
  {
    question: 'Can I share invitations digitally?',
    answer: 'Yes. FuneralPress allows you to download your invitation as a high-quality image or PDF that can be shared instantly via WhatsApp, Facebook, email, or any messaging platform. This is especially useful for reaching family members abroad.',
  },
]


export default function FuneralInvitationTemplatesPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Funeral Invitation Templates — Announce with Dignity | FuneralPress"
        description="Create funeral and burial invitation cards online. Beautiful templates for death announcements, funeral invitations, and memorial service notices. Share via WhatsApp."
        path="/funeral-invitation-templates"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Funeral Invitation Templates', path: '/funeral-invitation-templates' },
        ]}
        faqs={faqs}
      />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-16 pb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Funeral Invitation Templates
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          In Ghanaian culture, funeral invitations are a mark of respect and an essential part of the funeral planning process.
          Whether you are organising a burial service, one-week celebration, thanksgiving service, or memorial gathering,
          FuneralPress offers beautifully designed invitation card templates that you can personalise in minutes. Add the
          deceased's photo, service details, venue information, and download a print-ready PDF or share digitally via WhatsApp.
        </p>
      </section>

      {/* Invitation Style Grid */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-8 text-center">Invitation Card Styles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {invitationStyles.map((s) => (
            <div
              key={s.name}
              className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between hover:shadow-lg hover:border-primary/40 transition-all"
            >
              <div>
                <div className="w-full h-40 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4">
                  <span className="text-primary font-semibold text-lg text-center px-2">{s.name}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{s.name}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.description}</p>
              </div>
              <button
                onClick={() => navigate('/invitation-editor')}
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
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Send beautiful funeral invitations</h2>
          <p className="text-muted-foreground mb-8">
            Design a professional invitation card, download as PDF, or share instantly via WhatsApp and social media.
          </p>
          <button
            onClick={() => navigate('/invitation-editor')}
            className="px-8 py-3 rounded-xl bg-primary text-white font-semibold text-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            Start Designing <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
    </div>
  )
}
