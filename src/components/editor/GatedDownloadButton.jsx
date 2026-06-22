import { PDFDownloadLink } from '@react-pdf/renderer'
import { Download } from 'lucide-react'
import { usePurchaseStore } from '../../stores/purchaseStore'
import { events } from '../../utils/analytics'

// Known threat model: the unlock check below reads from the client-side
// purchaseStore, and react-pdf renders the PDF entirely in-browser, so a
// determined user with DevTools can manipulate `unlockedDesigns` to bypass
// the watermark. This is an accepted limitation for v1 — moving PDF generation
// server-side behind a signed URL is tracked as a P1 follow-up. Bypass requires
// real technical effort, and anyone willing to do it is unlikely to ever pay,
// so the leakage is bounded in practice.
export default function GatedDownloadButton({ document, fileName, designId, productType, disabled = false }) {
  const canDownload = usePurchaseStore(s => s.canDownload)
  const requestDownload = usePurchaseStore(s => s.requestDownload)

  if (disabled) {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 px-4 py-1.5 bg-muted text-white text-xs font-medium rounded-md cursor-not-allowed"
        aria-label="Preparing download"
      >
        <Download size={14} />
        Download PDF
      </button>
    )
  }

  if (canDownload(designId)) {
    return (
      <PDFDownloadLink document={document} fileName={fileName}>
        {({ loading }) => (
          <button
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground text-xs font-medium rounded-md transition-colors"
          >
            <Download size={14} />
            {loading ? 'Preparing...' : 'Download PDF'}
          </button>
        )}
      </PDFDownloadLink>
    )
  }

  return (
    <button
      onClick={() => {
        // Funnel stage "Completed design": the user finished a design and is
        // asking to download it (hits the paywall). Previously unemitted.
        events.brochureCompleted(productType)
        requestDownload(designId, productType)
      }}
      className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-md transition-colors"
    >
      <Download size={14} />
      Download PDF
    </button>
  )
}
