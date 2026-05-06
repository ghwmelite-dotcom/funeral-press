import { useNavigate, Link } from 'react-router-dom'
import PageMeta from '../../components/seo/PageMeta'
import FAQSection from '../../components/seo/FAQSection'
import {
  ArrowRight,
  Globe,
  BookOpen,
  Image,
  Heart,
  Lock,
  Share2,
  CheckCircle,
  ChevronRight,
  Users,
} from 'lucide-react'

const features = [
  {
    icon: Globe,
    title: 'Permanent Online Tribute',
    desc: 'Create a lasting online memorial page hosted permanently at a unique URL. Family and friends can visit anytime, from anywhere in the world.',
  },
  {
    icon: BookOpen,
    title: 'Virtual Guest Book',
    desc: 'Friends and family can leave heartfelt condolence messages and memories in the online guest book — no physical attendance required.',
  },
  {
    icon: Image,
    title: 'Photo & Video Gallery',
    desc: 'Upload photos and videos to build a rich media gallery celebrating your loved one\'s life, family, and achievements.',
  },
  {
    icon: Heart,
    title: 'Life Story Timeline',
    desc: 'Document key moments with a chronological timeline: birthplace, education, marriage, career, and other milestones.',
  },
  {
    icon: Lock,
    title: 'Privacy Controls',
    desc: 'Choose between a public memorial, private (invite-only), or family-only access. You control who can view and who can leave messages.',
  },
  {
    icon: Share2,
    title: 'Easy Sharing',
    desc: 'Share the memorial link via WhatsApp, Facebook, email, or QR code so relatives near and far can participate and pay their respects.',
  },
]

const faqs = [
  {
    question: 'What is an online memorial page?',
    answer: 'An online memorial page is a permanent digital tribute to a deceased person. It typically includes a biography, photos, video gallery, a life timeline, and a virtual guest book where family and friends can leave condolence messages. It is accessible from any device, anywhere in the world.',
  },
  {
    question: 'How do I create a memorial page on FuneralPress?',
    answer: 'Click "Create Memorial", enter the deceased\'s name, dates, and a biography, upload photos and videos, then publish. You will get a unique shareable link immediately. The full page can be built in under 30 minutes.',
  },
  {
    question: 'How much does it cost to create an online memorial?',
    answer: 'Creating and publishing a memorial page costs GHS 35 for a single memorial, GHS 75 for a bundle that includes a memorial plus brochure and poster, or GHS 120 for the Suite plan which covers all FuneralPress design types.',
  },
  {
    question: 'How long does the memorial page stay online?',
    answer: 'Memorial pages on FuneralPress are hosted permanently. There are no annual renewal fees — once created, the page remains accessible indefinitely.',
  },
  {
    question: 'Can I control who sees the memorial page?',
    answer: 'Yes. You can set the page to public (anyone with the link can view), private (requires an invitation), or family-only. Guest book comments can also be moderated before they appear publicly.',
  },
  {
    question: 'Can family members outside Ghana access the memorial page?',
    answer: 'Yes. The memorial page is hosted online and accessible from any country with an internet connection. This makes it especially valuable for diaspora family members who cannot attend in person.',
  },
  {
    question: 'Can people leave messages in the guest book without a FuneralPress account?',
    answer: 'Yes. Visitors can leave condolence messages by entering their name and message. No account or login is required for guests to participate in the virtual guest book.',
  },
  {
    question: 'How many photos can I add to the memorial page?',
    answer: 'The memorial page supports unlimited photo uploads. You can organise photos into albums such as childhood, family, career, and special occasions.',
  },
  {
    question: 'Can I add a video tribute to the memorial page?',
    answer: 'Yes. You can upload video clips directly or embed YouTube and Vimeo videos. Many families create a short video slideshow and embed it on the memorial page for visitors to watch.',
  },
  {
    question: 'Can the memorial page be shared on social media?',
    answer: 'Yes. The memorial page has built-in sharing buttons for WhatsApp, Facebook, and email. A QR code is also generated automatically so you can print it on the funeral brochure or poster for easy access.',
  },
  {
    question: 'Is the memorial page mobile-friendly?',
    answer: 'Yes. Memorial pages are fully responsive and designed to work perfectly on smartphones — which is how most Ghanaians access the internet. The page loads fast even on slower mobile networks.',
  },
]

const pricing = [
  { name: 'Single', price: 'GHS 35', desc: 'One memorial page, permanent hosting', cta: 'Create Memorial', primary: false },
  { name: 'Bundle', price: 'GHS 75', desc: 'Memorial + brochure + poster', cta: 'Best Value', primary: true },
  { name: 'Suite', price: 'GHS 120', desc: 'All designs, unlimited access', cta: 'Go Unlimited', primary: false },
]

export default function MemorialCreatorPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Memorial Page Creator — Online Tribute & Guest Book | FuneralPress"
        description="Create a beautiful online memorial page with a virtual guest book, photo gallery, and life story timeline. Permanent hosting. Share with family worldwide. Starts at GHS 35."
        path="/memorial-page-creator"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Memorial Page Creator', path: '/memorial-page-creator' },
        ]}
        faqs={faqs}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 pt-6">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li><Link to="/" className="hover:text-foreground transition-colors">Home</Link></li>
          <li><ChevronRight className="w-3.5 h-3.5" /></li>
          <li className="text-foreground font-medium">Memorial Page Creator</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-10 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <CheckCircle className="w-4 h-4" />
          Permanent online tribute, accessible worldwide
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
          Memorial Page Creator —<br className="hidden md:block" /> Online Tribute &amp; Guest Book
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
          Create a permanent online memorial for your loved one. Share photos, a life story,
          and a virtual guest book with family and friends across Ghana and around the world.
          No design skills required — publish in under 30 minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/obituary-creator')}
            className="px-8 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
          >
            Create Memorial Free <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/guest-book-creator')}
            className="px-8 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-card transition-colors"
          >
            Create Guest Book
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {[
            { value: '10,000+', label: 'Memorial pages created' },
            { value: '50,000+', label: 'Guest book messages' },
            { value: '16', label: 'Ghana regions served' },
            { value: 'Forever', label: 'Hosting duration' },
          ].map(({ value, label }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-5 text-center">
              <p className="text-2xl font-bold text-primary mb-1">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-2 text-center">Everything for a Complete Online Tribute</h2>
        <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
          More than a simple obituary — FuneralPress memorial pages are rich, interactive tributes
          that bring families together across distances.
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

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-10 text-center">Create Your Memorial in 4 Steps</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { step: '1', title: 'Enter Details', desc: 'Name, dates, hometown, and a biography.' },
            { step: '2', title: 'Upload Photos', desc: 'Add photos and videos to the gallery.' },
            { step: '3', title: 'Customise', desc: 'Choose a theme and add Adinkra elements.' },
            { step: '4', title: 'Share the Link', desc: 'Publish and share via WhatsApp or QR code.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                {step}
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial / Social Proof */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <Users className="w-8 h-8 text-primary mx-auto mb-4" />
          <p className="text-lg text-foreground leading-relaxed mb-4">
            "Creating an online memorial for our mother allowed relatives in the UK, USA, and Canada
            to participate fully in the mourning process even though they couldn't travel to Ghana.
            The guest book messages from abroad were read aloud at the funeral — it was very moving."
          </p>
          <p className="text-sm text-muted-foreground">— Family from Greater Accra</p>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-2 text-center">Simple, Transparent Pricing</h2>
        <p className="text-muted-foreground text-center mb-10">Permanent hosting included. No annual fees. No subscriptions.</p>
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
                onClick={() => navigate('/obituary-creator')}
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
            Create a Lasting Tribute Online
          </h2>
          <p className="text-muted-foreground mb-8">
            Preserve your loved one's memory with a beautiful online memorial page.
            Share with family anywhere in the world. Hosted permanently, free from annual fees.
          </p>
          <button
            onClick={() => navigate('/obituary-creator')}
            className="px-8 py-3 rounded-xl bg-primary text-white font-semibold text-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            Create Memorial Now <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
    </div>
  )
}
