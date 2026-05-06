import { useNavigate } from 'react-router-dom'
import PageMeta from '../../components/seo/PageMeta'
import FAQSection from '../../components/seo/FAQSection'
import { ArrowRight } from 'lucide-react'

const denominationTemplates = [
  { name: 'Methodist', description: 'Follows the Methodist order of service with responsive readings, Wesley hymns, and structured liturgy. Includes sections for the officiating minister, scripture readings, and benediction.' },
  { name: 'Catholic', description: 'Formatted for the Catholic Requiem Mass with the Order of Mass, readings, responsorial psalms, communion rite, and final commendation. Includes Latin and English text options.' },
  { name: 'Presbyterian', description: 'Aligned with Presbyterian Church of Ghana funeral liturgy. Includes call to worship, scripture readings, sermon notes, and committal service sections.' },
  { name: 'Pentecostal', description: 'A vibrant, spirit-filled layout with praise and worship sections, altar call moments, and contemporary song listings. Flexible structure for charismatic services.' },
  { name: 'Charismatic', description: 'Modern, energetic design suited for charismatic church services. Includes worship session, ministration, special tributes, and a celebration-of-life timeline.' },
  { name: 'SDA (Seventh-day Adventist)', description: 'Structured for Adventist memorial services with Sabbath-appropriate hymns, scripture passages, and a life-sketch section. Follows SDA funeral guidelines.' },
  { name: 'Anglican', description: 'Follows the Book of Common Prayer funeral rite. Includes processional, psalms, collects, committal, and recessional sections with traditional Anglican formatting.' },
]

const faqs = [
  {
    question: 'What is a funeral booklet?',
    answer: 'A funeral booklet (also called an order of service programme or funeral programme) is a multi-page printed document distributed to mourners at a funeral service. It typically includes the order of service, hymns, tributes, biography of the deceased, photos, and acknowledgements. In Ghana, funeral booklets are a cherished keepsake for attendees.',
  },
  {
    question: 'Do you have templates for my church denomination?',
    answer: 'Yes. FuneralPress offers denomination-specific booklet templates for Methodist, Catholic, Presbyterian, Pentecostal, Charismatic, SDA (Seventh-day Adventist), and Anglican churches. Each template follows the specific liturgical order and hymn format of that denomination.',
  },
  {
    question: 'How many pages can a booklet have?',
    answer: 'FuneralPress booklets support 4 to 24 pages. The most common formats are 8-page and 12-page booklets. You can add or remove pages as needed, and each page is fully customisable with text, photos, hymns, and tributes.',
  },
]


export default function FuneralBookletTemplatesPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Order of Service Booklet Templates — Design Online | FuneralPress"
        description="Design funeral order of service booklets with our easy editor. Add hymns, tributes, programme of events, and photos. Print-ready PDF download included."
        path="/funeral-booklet-templates"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Funeral Booklet Templates', path: '/funeral-booklet-templates' },
        ]}
        faqs={faqs}
      />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-16 pb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Funeral Booklet Templates
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          A funeral booklet — also known as an order of service programme — is the centrepiece of any Ghanaian funeral.
          FuneralPress offers denomination-specific booklet templates that follow the exact liturgical order of your church.
          From Methodist responsive readings to Catholic Requiem Mass formats, each template includes sections for hymns,
          scripture readings, tributes, biography, photos, and acknowledgements. Create a multi-page, print-ready booklet
          that serves as both a service guide and a lasting memorial keepsake.
        </p>
      </section>

      {/* Denomination Grid */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-8 text-center">Denomination-Specific Templates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {denominationTemplates.map((t) => (
            <div
              key={t.name}
              className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between hover:shadow-lg hover:border-primary/40 transition-all"
            >
              <div>
                <div className="w-full h-40 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4">
                  <span className="text-primary font-semibold text-lg text-center px-2">{t.name}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{t.name} Template</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{t.description}</p>
              </div>
              <button
                onClick={() => navigate('/booklet-editor')}
                className="mt-4 w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                Use This Template <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Additional Info */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-6 text-center">What's Inside a Funeral Booklet?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: 'Cover Page', desc: 'A beautifully designed cover with the deceased\'s portrait, full name, dates of birth and death, and a meaningful epitaph.' },
            { title: 'Order of Service', desc: 'A structured programme listing every element of the funeral service, from the processional to the benediction.' },
            { title: 'Tributes & Biography', desc: 'Dedicated pages for family tributes, a life biography, and messages from friends, colleagues, and community members.' },
            { title: 'Hymns & Songs', desc: 'Full hymn lyrics formatted for easy reading, with hymn numbers for denominational hymnals.' },
            { title: 'Photo Gallery', desc: 'A curated selection of photos celebrating the life and legacy of the deceased across different life stages.' },
            { title: 'Acknowledgements', desc: 'A closing page thanking all who supported the family, with special mentions for pallbearers, choirs, and organisers.' },
          ].map((item) => (
            <div key={item.title} className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
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
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Create a professional funeral booklet</h2>
          <p className="text-muted-foreground mb-8">
            Choose your denomination, customise every page with photos, hymns, and tributes, and download a print-ready PDF booklet.
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
