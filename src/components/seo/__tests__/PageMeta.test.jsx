// src/components/seo/__tests__/PageMeta.test.jsx
// Adaptation note: react-helmet-async v3 does not populate ctx.helmet.script
// in jsdom (canUseDOM=true) — it writes to document.head instead.
// We query <script type="application/ld+json"> tags from document.head after
// rendering with waitFor, as the plan authorises. The ASSERTIONS (which schemas
// appear/don't) are the contract; the harness mechanics are adapted.
import { describe, it, expect, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import PageMeta from '../PageMeta.jsx'

async function getRenderedJsonLd() {
  let combined = ''
  await waitFor(() => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]')
    combined = Array.from(scripts).map((s) => s.textContent || s.innerHTML).join('\n')
  })
  return combined
}

afterEach(() => {
  // Remove ld+json scripts injected by Helmet between tests
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.parentNode?.removeChild(s))
})

describe('PageMeta structured data extensions', () => {
  it('emits SpeakableSpecification when speakable selectors are given', async () => {
    render(
      <HelmetProvider>
        <PageMeta title="T" description="D" path="/x" speakable={['.intro', 'h1']} />
      </HelmetProvider>
    )
    const scripts = await getRenderedJsonLd()
    expect(scripts).toContain('SpeakableSpecification')
    expect(scripts).toContain('.intro')
  })

  it('emits HowTo schema when howTo is given', async () => {
    render(
      <HelmetProvider>
        <PageMeta
          title="T" description="D" path="/x"
          howTo={{ name: 'How to create a funeral brochure', steps: [
            { name: 'Choose a theme', text: 'Pick from Ghanaian themes like Kente Gold.' },
            { name: 'Add their story', text: 'Upload photos and write the biography.' },
          ] }}
        />
      </HelmetProvider>
    )
    const scripts = await getRenderedJsonLd()
    expect(scripts).toContain('"HowTo"')
    expect(scripts).toContain('HowToStep')
    expect(scripts).toContain('Choose a theme')
  })

  it('emits arbitrary jsonLd objects verbatim', async () => {
    render(
      <HelmetProvider>
        <PageMeta title="T" description="D" path="/x"
          jsonLd={{ '@context': 'https://schema.org', '@type': 'MusicComposition', name: 'Abide With Me' }} />
      </HelmetProvider>
    )
    const scripts = await getRenderedJsonLd()
    expect(scripts).toContain('MusicComposition')
    expect(scripts).toContain('Abide With Me')
  })

  it('emits none of the above when props are absent (no regressions)', async () => {
    render(
      <HelmetProvider>
        <PageMeta title="T" description="D" path="/x" />
      </HelmetProvider>
    )
    const scripts = await getRenderedJsonLd()
    expect(scripts).not.toContain('SpeakableSpecification')
    expect(scripts).not.toContain('"HowTo"')
  })
})
