import { PDFDownloadLink } from '@react-pdf/renderer'
import { Download } from 'lucide-react'
import { usePurchaseStore } from '../../stores/purchaseStore'

export default function GatedDownloadButton({ document, fileName, designId, productType }) {
  const canDownload = usePurchaseStore(s => s.canDownload)
  const requestDownload = usePurchaseStore(s => s.requestDownload)

  if (canDownload(designId)) {
    return (
      <PDFDownloadLink document={document} fileName={fileName}>
        {({ loading }) => (
          <button
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary/90 disabled:bg-muted text-white text-xs font-medium rounded-md transition-colors"
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
      onClick={() => requestDownload(designId, productType)}
      className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-medium rounded-md transition-colors"
    >
      <Download size={14} />
      Download PDF
    </button>
  )
}
