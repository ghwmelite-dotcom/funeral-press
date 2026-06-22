// src/pages/landing/DiasporaPage.jsx
// Data-driven diaspora landing pages (spec §3.4). One component, five pages —
// content lives in src/data/diasporaPages.js. Currency display defaults to the
// visitor's geo currency (GBP/USD for the diaspora audience).
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PageMeta from '../../components/seo/PageMeta'
import FAQSection from '../../components/seo/FAQSection'
import CurrencySwitcher from '../../components/pricing/CurrencySwitcher'
import { useCurrencyStore } from '../../stores/currencyStore'
import { priceFor, formatMoney } from '../../config/priceBook'
import { DIASPORA_PAGES } from '../../data/diasporaPages'
import { KenteBand, CeremonialDivider } from '../../components/ceremonial'

export default function DiasporaPage() {
  const { slug } = useParams()
  const page = DIASPORA_PAGES[slug]
  const currency = useCurrencyStore((s) => s.currency)
  const hydrate = useCurrencyStore((s) => s.hydrate)

  useEffect(() => { hydrate() }, [hydrate])

  if (!page) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center px-4">
        <div>
          <h1 className="text-xl font-semibold text-card-foreground mb-2">Page not found</h1>
          <Link to="/" className="text-sm text-primary hover:underline">Back to FuneralPress</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <KenteBand size="page" />
      <PageMeta
        title={page.title}
        description={page.description}
        path={`/diaspora/${slug}`}
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Diaspora', path: `/diaspora/${slug}` }, { name: page.breadcrumb, path: `/diaspora/${slug}` }]}
        faqs={page.faqs}
        speakable={['.diaspora-intro', 'h1']}
      />

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-4 pt-16 pb-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-card-foreground mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {page.h1}
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed max-w-2xl mx-auto mb-8 diaspora-intro">{page.intro}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to={page.cta.to} className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors">
            {page.cta.label}
          </Link>
          <Link to="/honour" className="px-6 py-3 border border-border text-sm text-card-foreground rounded-lg hover:border-primary/40 transition-colors">
            Explore all tools
          </Link>
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-3xl mx-auto px-4 pb-12 space-y-10">
        {page.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-xl font-semibold text-card-foreground mb-3">{s.heading}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-3">{p}</p>
            ))}
            {s.link && (
              <Link to={s.link.to} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                {s.link.label} <ArrowRight size={14} />
              </Link>
            )}
          </section>
        ))}
      </div>

      <CeremonialDivider />

      {/* Pricing strip */}
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <div className="overflow-hidden bg-card border border-border rounded-xl text-center">
          <KenteBand size="card" />
          <div className="p-6">
            <div className="flex justify-end mb-2"><CurrencySwitcher /></div>
            <p className="text-sm text-muted-foreground mb-1">A complete set of funeral designs from</p>
            <p className="text-3xl font-bold text-card-foreground mb-1">{formatMoney(priceFor('bundle', currency), currency)}</p>
            <p className="text-xs text-muted-foreground">One-time. Unlimited designs from {formatMoney(priceFor('suite', currency), currency)} · Pro from {formatMoney(priceFor('pro_monthly', currency), currency)}/month</p>
          </div>
        </div>
      </div>

      <CeremonialDivider />

      {/* FAQs */}
      <div className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-xl font-semibold text-card-foreground mb-5">Frequently asked questions</h2>
        <FAQSection faqs={page.faqs} />
      </div>
    </div>
  )
}
