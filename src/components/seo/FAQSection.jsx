import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../ui/accordion'

/**
 * Accessible FAQ accordion using Radix primitives.
 * Provides aria-expanded, aria-controls, keyboard nav, and smooth animation.
 *
 * @param {Array<{question: string, answer: string}>} faqs
 */
export default function FAQSection({ faqs }) {
  if (!faqs?.length) return null

  return (
    <Accordion type="single" collapsible className="space-y-3">
      {faqs.map((faq, i) => (
        <AccordionItem
          key={i}
          value={`faq-${i}`}
          className="border border-border rounded-xl overflow-hidden"
        >
          <AccordionTrigger className="px-5 sm:px-6 py-4 text-left text-foreground font-medium hover:bg-card hover:no-underline transition-colors">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="px-5 sm:px-6 text-muted-foreground leading-relaxed text-sm">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
