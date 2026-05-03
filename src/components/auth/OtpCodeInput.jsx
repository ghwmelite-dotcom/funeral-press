import { useRef, useEffect } from 'react'

export function OtpCodeInput({ value = '', onChange, length = 6, autoFocus = true, disabled = false }) {
  const refs = useRef([])

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus()
  }, [autoFocus])

  const handleChange = (i, raw) => {
    const digit = raw.slice(-1).replace(/[^\d]/g, '')
    const next = (value.padEnd(length, ' ').split('')).map((c, idx) => idx === i ? (digit || ' ') : c).join('').trimEnd()
    onChange?.(next)
    if (digit && i < length - 1) refs.current[i + 1]?.focus()
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/[^\d]/g, '').slice(0, length)
    if (pasted.length === length) {
      onChange?.(pasted)
      refs.current[length - 1]?.focus()
      e.preventDefault()
    }
  }

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus()
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          value={value[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className="w-12 h-14 text-2xl text-center border rounded-lg bg-background border-border focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  )
}
