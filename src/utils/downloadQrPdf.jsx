import { pdf, Document, Page, Image } from '@react-pdf/renderer'
import { toPng } from 'html-to-image'

const CREAM = '#FDF8F0'

// A4 in points (used by @react-pdf/renderer)
const A4_W = 595.28
const A4_H = 841.89

/**
 * Capture a DOM element as a high-res PNG, wrap in an A4 PDF, and trigger download.
 */
export async function downloadCardAsPdf(element, filename) {
  const dataUrl = await toPng(element, {
    pixelRatio: 3,
    cacheBust: true,
    backgroundColor: CREAM,
  })

  const PdfDoc = () => (
    <Document>
      <Page size="A4" style={{ margin: 0, padding: 0 }}>
        <Image src={dataUrl} style={{ width: A4_W, height: A4_H }} />
      </Page>
    </Document>
  )

  const blob = await pdf(<PdfDoc />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Capture a tall DOM element, split into A4 pages, and trigger download.
 * The element is rendered at `captureWidth` px and sliced into pages
 * proportional to an A4 aspect ratio.
 */
export async function downloadPageAsPdf(element, filename, { bgColor = '#ffffff' } = {}) {
  const captureWidth = element.scrollWidth || element.offsetWidth

  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: bgColor,
    width: captureWidth,
    height: element.scrollHeight,
  })

  // Load as an Image to get true pixel dimensions
  const img = await new Promise((resolve) => {
    const i = new window.Image()
    i.onload = () => resolve(i)
    i.src = dataUrl
  })

  const imgW = img.naturalWidth
  const imgH = img.naturalHeight
  const pageSliceH = Math.floor(imgW * (A4_H / A4_W))
  const totalPages = Math.ceil(imgH / pageSliceH)

  // Slice into pages using off-screen canvas
  const pageImages = []
  for (let p = 0; p < totalPages; p++) {
    const canvas = document.createElement('canvas')
    canvas.width = imgW
    canvas.height = pageSliceH
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, imgW, pageSliceH)
    ctx.drawImage(img, 0, -(p * pageSliceH))
    pageImages.push(canvas.toDataURL('image/png'))
  }

  const PdfDoc = () => (
    <Document>
      {pageImages.map((src, i) => (
        <Page key={i} size="A4" style={{ margin: 0, padding: 0 }}>
          <Image src={src} style={{ width: A4_W, height: A4_H }} />
        </Page>
      ))}
    </Document>
  )

  const blob = await pdf(<PdfDoc />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
