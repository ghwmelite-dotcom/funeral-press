import { useState } from 'react'
import { parsePhoneNumberFromString, getCountryCallingCode } from 'libphonenumber-js'

const COUNTRIES = [
  { code: 'GH', flag: '🇬🇭', name: 'Ghana' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria' },
]

export function PhoneInput({ value, onChange, country, onCountryChange, autoFocus, className = '' }) {
  // Seed local raw-digit state from the incoming E.164 value (digits only) so the component
  // can be re-mounted with a value while still letting users type freely.
  const [local, setLocal] = useState(() => (value || '').replace(/[^\d]/g, ''))

  const handleLocalChange = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, '')
    setLocal(raw)
    const parsed = parsePhoneNumberFromString(raw, country)
    onChange?.(parsed?.isValid() ? parsed.number : '')
  }

  return (
    <div className={`flex items-stretch border rounded-lg overflow-hidden bg-background border-border ${className}`}>
      <select
        className="bg-muted px-3 py-2 border-r border-border focus:outline-none focus:ring-2 focus:ring-primary"
        value={country}
        onChange={(e) => onCountryChange?.(e.target.value)}
        aria-label="Country"
      >
        {COUNTRIES.map(c => (
          <option key={c.code} value={c.code}>{c.flag} +{getCountryCallingCode(c.code)}</option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        autoFocus={autoFocus}
        value={local}
        onChange={handleLocalChange}
        placeholder="24 123 4567"
        className="flex-1 px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Phone number"
      />
    </div>
  )
}
