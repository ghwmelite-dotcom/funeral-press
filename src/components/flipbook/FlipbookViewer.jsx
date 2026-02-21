import { useRef, useState, useCallback, forwardRef } from 'react'
import HTMLFlipBook from 'react-pageflip'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PageImage = forwardRef(function PageImage({ src, pageNum }, ref) {
  return (
    <div ref={ref} className="bg-white">
      <img
        src={src}
        alt={`Page ${pageNum}`}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  )
})

export default function FlipbookViewer({ images }) {
  const bookRef = useRef(null)
  const [currentPage, setCurrentPage] = useState(0)
  const totalPages = images.length

  const onFlip = useCallback((e) => {
    setCurrentPage(e.data)
  }, [])

  const goNext = () => bookRef.current?.pageFlip()?.flipNext()
  const goPrev = () => bookRef.current?.pageFlip()?.flipPrev()

  if (!images || images.length === 0) return null

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Book container */}
      <div className="relative">
        <HTMLFlipBook
          ref={bookRef}
          width={400}
          height={566}
          size="stretch"
          minWidth={280}
          maxWidth={600}
          minHeight={396}
          maxHeight={850}
          showCover={true}
          mobileScrollSupport={true}
          onFlip={onFlip}
          className="shadow-2xl"
          style={{}}
          startPage={0}
          drawShadow={true}
          flippingTime={800}
          usePortrait={true}
          startZIndex={0}
          autoSize={true}
          maxShadowOpacity={0.5}
          showPageCorners={true}
          disableFlipByClick={false}
        >
          {images.map((src, i) => (
            <PageImage key={i} src={src} pageNum={i + 1} />
          ))}
        </HTMLFlipBook>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={goPrev}
          disabled={currentPage === 0}
          className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>

        <span className="text-xs text-muted-foreground tabular-nums min-w-[80px] text-center">
          Page {currentPage + 1} of {totalPages}
        </span>

        <button
          onClick={goNext}
          disabled={currentPage >= totalPages - 1}
          className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  )
}
