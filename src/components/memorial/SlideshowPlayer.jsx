import { useRef, useEffect } from 'react'
import { themes } from '../../utils/themes'

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function SlideshowPlayer({ slide, transitioning, themeKey, canvasRef }) {
  const internalCanvasRef = useRef(null)
  const canvas = canvasRef || internalCanvasRef
  const theme = themes[themeKey] || themes.blackGold

  useEffect(() => {
    if (!canvas.current || !slide) return

    const c = canvas.current
    const ctx = c.getContext('2d')
    c.width = 1920
    c.height = 1080

    // Background
    ctx.fillStyle = theme.pageBg
    ctx.fillRect(0, 0, 1920, 1080)

    const drawText = (text, x, y, options = {}) => {
      const { size = 24, color = theme.bodyText, align = 'center', maxWidth = 1600, font = 'serif', weight = 'normal' } = options
      ctx.fillStyle = color
      ctx.font = `${weight} ${size}px ${font}`
      ctx.textAlign = align

      // Word wrap
      const words = text.split(' ')
      let line = ''
      let lineY = y
      const lineHeight = size * 1.5

      for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxWidth && line) {
          ctx.fillText(line, x, lineY)
          line = word
          lineY += lineHeight
        } else {
          line = testLine
        }
      }
      ctx.fillText(line, x, lineY)
      return lineY + lineHeight
    }

    const drawCross = (x, y, size = 30) => {
      ctx.fillStyle = theme.heading
      ctx.fillRect(x - size * 0.08, y - size * 0.4, size * 0.16, size * 0.8)
      ctx.fillRect(x - size * 0.3, y - size * 0.25, size * 0.6, size * 0.16)
    }

    const drawDivider = (y) => {
      ctx.strokeStyle = theme.border
      ctx.globalAlpha = 0.4
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(760, y)
      ctx.lineTo(1160, y)
      ctx.stroke()
      ctx.globalAlpha = 1

      // Center diamond
      ctx.fillStyle = theme.border
      ctx.save()
      ctx.translate(960, y)
      ctx.rotate(Math.PI / 4)
      ctx.fillRect(-5, -5, 10, 10)
      ctx.restore()
    }

    switch (slide.type) {
      case 'cover': {
        drawCross(960, 120)
        drawText(slide.subtitle || 'Celebration of Life', 960, 200, { size: 18, color: theme.subtleText, weight: 'normal' })

        // Photo circle
        if (slide.image) {
          const img = new Image()
          img.onload = () => {
            ctx.save()
            ctx.beginPath()
            ctx.arc(960, 460, 150, 0, Math.PI * 2)
            ctx.closePath()
            ctx.clip()
            const aspect = img.width / img.height
            const drawW = aspect > 1 ? 300 : 300 * aspect
            const drawH = aspect > 1 ? 300 / aspect : 300
            ctx.drawImage(img, 960 - drawW / 2, 460 - drawH / 2, drawW, drawH)
            ctx.restore()

            // Border circle
            ctx.strokeStyle = theme.border
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.arc(960, 460, 152, 0, Math.PI * 2)
            ctx.stroke()

            drawText(slide.title, 960, 670, { size: 42, color: theme.heading, weight: 'bold' })
            drawDivider(740)

            if (slide.dateOfBirth && slide.dateOfDeath) {
              drawText(`${formatDate(slide.dateOfBirth)} — ${formatDate(slide.dateOfDeath)}`, 960, 800, { size: 20, color: theme.subtleText })
            }
          }
          img.src = slide.image
        } else {
          drawText(slide.title, 960, 460, { size: 48, color: theme.heading, weight: 'bold' })
          drawDivider(530)
          if (slide.dateOfBirth && slide.dateOfDeath) {
            drawText(`${formatDate(slide.dateOfBirth)} — ${formatDate(slide.dateOfDeath)}`, 960, 600, { size: 20, color: theme.subtleText })
          }
        }
        break
      }

      case 'verse': {
        drawCross(960, 300)
        drawText(slide.text, 960, 420, { size: 26, color: theme.subtleText, maxWidth: 1000, font: 'Georgia, serif' })
        break
      }

      case 'text': {
        if (slide.heading) {
          drawText(slide.heading.toUpperCase(), 960, 200, { size: 22, color: theme.heading, weight: 'bold' })
          drawDivider(250)
        }
        drawText(slide.text, 960, 340, { size: 22, color: theme.bodyText, maxWidth: 1200 })
        break
      }

      case 'photo': {
        if (slide.heading) {
          drawText(slide.heading.toUpperCase(), 960, 80, { size: 20, color: theme.heading, weight: 'bold' })
        }
        if (slide.image) {
          const img = new Image()
          img.onload = () => {
            const maxW = 1400, maxH = 800
            const aspect = img.width / img.height
            let w = maxW, h = maxW / aspect
            if (h > maxH) { h = maxH; w = maxH * aspect }
            const x = (1920 - w) / 2
            const y = slide.heading ? 140 : (1080 - h) / 2 - 20

            // Shadow
            ctx.shadowColor = 'rgba(0,0,0,0.3)'
            ctx.shadowBlur = 20
            ctx.drawImage(img, x, y, w, h)
            ctx.shadowBlur = 0

            // Border
            ctx.strokeStyle = theme.border
            ctx.lineWidth = 2
            ctx.strokeRect(x, y, w, h)

            if (slide.caption) {
              drawText(slide.caption, 960, y + h + 40, { size: 16, color: theme.subtleText })
            }
          }
          img.src = slide.image
        }
        break
      }

      case 'quote': {
        drawCross(960, 280)
        ctx.font = 'italic 28px Georgia, serif'
        const quoteY = drawText(`"${slide.text}"`, 960, 420, { size: 28, color: theme.bodyText, maxWidth: 1100, font: 'Georgia, serif' })
        if (slide.author) {
          drawText(`— ${slide.author}`, 960, quoteY + 30, { size: 18, color: theme.subtleText })
        }
        break
      }

      case 'closing': {
        drawCross(960, 200)

        if (slide.image) {
          const img = new Image()
          img.onload = () => {
            ctx.save()
            ctx.beginPath()
            ctx.arc(960, 420, 120, 0, Math.PI * 2)
            ctx.clip()
            const aspect = img.width / img.height
            const drawW = aspect > 1 ? 240 : 240 * aspect
            const drawH = aspect > 1 ? 240 / aspect : 240
            ctx.drawImage(img, 960 - drawW / 2, 420 - drawH / 2, drawW, drawH)
            ctx.restore()
            ctx.strokeStyle = theme.border
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.arc(960, 420, 122, 0, Math.PI * 2)
            ctx.stroke()

            drawText(slide.title, 960, 600, { size: 40, color: theme.heading, weight: 'bold' })
            if (slide.subtitle) {
              drawText(slide.subtitle, 960, 670, { size: 22, color: theme.subtleText })
            }
            drawDivider(720)
            if (slide.verse) {
              drawText(slide.verse, 960, 800, { size: 16, color: theme.subtleText, maxWidth: 900, font: 'Georgia, serif' })
            }
          }
          img.src = slide.image
        } else {
          drawText(slide.title, 960, 400, { size: 48, color: theme.heading, weight: 'bold' })
          if (slide.subtitle) {
            drawText(slide.subtitle, 960, 480, { size: 24, color: theme.subtleText })
          }
          drawDivider(540)
          if (slide.verse) {
            drawText(slide.verse, 960, 640, { size: 18, color: theme.subtleText, maxWidth: 900, font: 'Georgia, serif' })
          }
        }
        break
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide, theme])

  return (
    <div className="relative flex-1 flex items-center justify-center bg-black overflow-hidden">
      <canvas
        ref={canvas}
        className={`max-w-full max-h-full transition-opacity duration-500 ${transitioning ? 'opacity-0' : 'opacity-100'}`}
        style={{ aspectRatio: '16/9' }}
      />
    </div>
  )
}
