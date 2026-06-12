import { useMemo } from 'react'
import { Helmet } from 'react-helmet-async'

// JSON-LD is injected via innerHTML; escaping `<` prevents a literal
// `</script>` inside any field (user or AI supplied) from breaking out of
// the script tag, while keeping the JSON valid.
const jsonLdString = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c')

/**
 * Enhanced SEO meta component with structured data support.
 *
 * @param {string} title — Page title (50-60 chars ideal)
 * @param {string} description — Meta description (150-160 chars ideal)
 * @param {string} path — URL path (e.g. '/blog/my-post')
 * @param {string} type — og:type ('website' | 'article')
 * @param {string} image — OG image URL
 * @param {object} article — Article schema props { datePublished, dateModified, keywords }
 * @param {Array} breadcrumbs — Array of { name, path } for BreadcrumbList schema
 * @param {Array} faqs — Array of { question, answer } for FAQPage schema
 */
export default function PageMeta({
  title,
  description,
  path = '/',
  type = 'website',
  image,
  article,
  breadcrumbs,
  faqs,
  speakable,
  howTo,
  jsonLd,
}) {
  const url = `https://funeralpress.org${path}`
  const ogImage = image || 'https://funeralpress.org/og-image.png'

  const breadcrumbSchema = useMemo(
    () =>
      breadcrumbs?.length
        ? jsonLdString({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbs.map((crumb, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: crumb.name,
              item: `https://funeralpress.org${crumb.path}`,
            })),
          })
        : null,
    [breadcrumbs],
  )

  const faqSchema = useMemo(
    () =>
      faqs?.length
        ? jsonLdString({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
              },
            })),
          })
        : null,
    [faqs],
  )

  const articleSchema = useMemo(
    () =>
      type === 'article' && article
        ? jsonLdString({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: title,
            description,
            image: ogImage,
            datePublished: article.datePublished,
            dateModified: article.dateModified || article.datePublished,
            author: {
              '@type': 'Organization',
              '@id': 'https://funeralpress.org/#organization',
              name: 'FuneralPress',
              url: 'https://funeralpress.org',
            },
            publisher: {
              '@type': 'Organization',
              '@id': 'https://funeralpress.org/#organization',
              name: 'FuneralPress',
              url: 'https://funeralpress.org',
              logo: {
                '@type': 'ImageObject',
                url: 'https://funeralpress.org/logo.svg',
              },
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': url,
            },
            keywords: article.keywords?.join(', '),
          })
        : null,
    [type, article, title, description, ogImage, url],
  )

  const speakableSchema = useMemo(
    () =>
      speakable?.length
        ? jsonLdString({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            '@id': url,
            speakable: {
              '@type': 'SpeakableSpecification',
              cssSelector: speakable,
            },
          })
        : null,
    [speakable, url],
  )

  const howToSchema = useMemo(
    () =>
      howTo?.steps?.length
        ? jsonLdString({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: howTo.name,
            step: howTo.steps.map((s, i) => ({
              '@type': 'HowToStep',
              position: i + 1,
              name: s.name,
              text: s.text,
            })),
          })
        : null,
    [howTo],
  )

  const extraJsonLd = useMemo(
    () => (jsonLd ? jsonLdString(jsonLd) : null),
    [jsonLd],
  )

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="FuneralPress" />
      <meta property="og:locale" content="en_GH" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Article-specific OG tags */}
      {type === 'article' && article?.datePublished && (
        <meta property="article:published_time" content={article.datePublished} />
      )}
      {type === 'article' && article?.dateModified && (
        <meta property="article:modified_time" content={article.dateModified} />
      )}

      {/* Structured Data: BreadcrumbList */}
      {breadcrumbSchema && (
        <script type="application/ld+json">{breadcrumbSchema}</script>
      )}

      {/* Structured Data: FAQPage */}
      {faqSchema && (
        <script type="application/ld+json">{faqSchema}</script>
      )}

      {/* Structured Data: Article */}
      {articleSchema && (
        <script type="application/ld+json">{articleSchema}</script>
      )}

      {/* Structured Data: SpeakableSpecification */}
      {speakableSchema && <script type="application/ld+json">{speakableSchema}</script>}

      {/* Structured Data: HowTo */}
      {howToSchema && <script type="application/ld+json">{howToSchema}</script>}

      {/* Structured Data: arbitrary JSON-LD */}
      {extraJsonLd && <script type="application/ld+json">{extraJsonLd}</script>}
    </Helmet>
  )
}
