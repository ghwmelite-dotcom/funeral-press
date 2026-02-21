import { useState } from 'react'
import { useBrochureStore } from '../../stores/brochureStore'
import { validateField } from '../../utils/validation'
import { themes } from '../../utils/themes'

const TITLES = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Rev.', 'Prof.', 'Chief', 'Nana', 'Hon.', 'Togbe', 'Mama']

function RequiredBadge() {
  return (
    <span className="ml-1.5 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-red-400/10 text-red-400 rounded">
      Required
    </span>
  )
}

function OptionalBadge() {
  return (
    <span className="ml-1.5 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-muted text-muted-foreground rounded">
      Optional
    </span>
  )
}

export default function BasicInfoForm() {
  const store = useBrochureStore()
  const [touched, setTouched] = useState({})

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const getValidation = (field) => {
    if (!touched[field]) return { valid: true, error: null }
    return validateField(field, store[field], store)
  }

  const fullNameValidation = getValidation('fullName')
  const dateOfBirthValidation = getValidation('dateOfBirth')
  const dateOfDeathValidation = getValidation('dateOfDeath')
  const funeralDateValidation = getValidation('funeralDate')
  const funeralVenueValidation = getValidation('funeralVenue')

  const inputBase = 'w-full bg-card border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring'
  const borderNormal = 'border-input'
  const borderError = 'border-red-500'

  return (
    <div className="space-y-4">
      {/* Title + Name */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-28">
          <label className="block text-xs text-muted-foreground mb-1">
            Title
            <OptionalBadge />
          </label>
          <select
            value={store.title}
            onChange={(e) => store.updateField('title', e.target.value)}
            className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">--</option>
            {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-muted-foreground mb-1">
            Full Name of Deceased
            <RequiredBadge />
          </label>
          <input
            type="text"
            value={store.fullName}
            onChange={(e) => store.updateField('fullName', e.target.value)}
            onBlur={() => handleBlur('fullName')}
            placeholder="e.g. Josephine Worla Ameovi-Hodges"
            className={`${inputBase} ${!fullNameValidation.valid ? borderError : borderNormal} placeholder:text-muted-foreground/60`}
          />
          {!fullNameValidation.valid && (
            <p className="text-[11px] text-red-400 mt-1">{fullNameValidation.error}</p>
          )}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Date of Birth
            <RequiredBadge />
          </label>
          <input
            type="date"
            value={store.dateOfBirth}
            onChange={(e) => store.updateField('dateOfBirth', e.target.value)}
            onBlur={() => handleBlur('dateOfBirth')}
            className={`${inputBase} ${!dateOfBirthValidation.valid ? borderError : borderNormal}`}
          />
          {!dateOfBirthValidation.valid && (
            <p className="text-[11px] text-red-400 mt-1">{dateOfBirthValidation.error}</p>
          )}
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Date of Death
            <RequiredBadge />
          </label>
          <input
            type="date"
            value={store.dateOfDeath}
            onChange={(e) => store.updateField('dateOfDeath', e.target.value)}
            onBlur={() => handleBlur('dateOfDeath')}
            className={`${inputBase} ${!dateOfDeathValidation.valid ? borderError : borderNormal}`}
          />
          {!dateOfDeathValidation.valid && (
            <p className="text-[11px] text-red-400 mt-1">{dateOfDeathValidation.error}</p>
          )}
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Funeral Date
            <RequiredBadge />
          </label>
          <input
            type="date"
            value={store.funeralDate}
            onChange={(e) => store.updateField('funeralDate', e.target.value)}
            onBlur={() => handleBlur('funeralDate')}
            className={`${inputBase} ${!funeralDateValidation.valid ? borderError : borderNormal}`}
          />
          {!funeralDateValidation.valid && (
            <p className="text-[11px] text-red-400 mt-1">{funeralDateValidation.error}</p>
          )}
        </div>
      </div>

      {/* Time */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">
          Funeral Start Time
          <OptionalBadge />
        </label>
        <input
          type="time"
          value={store.funeralTime}
          onChange={(e) => store.updateField('funeralTime', e.target.value)}
          className="w-44 bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Venue */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">
          Funeral Venue
          <RequiredBadge />
        </label>
        <input
          type="text"
          value={store.funeralVenue}
          onChange={(e) => store.updateField('funeralVenue', e.target.value)}
          onBlur={() => handleBlur('funeralVenue')}
          className={`${inputBase} ${!funeralVenueValidation.valid ? borderError : borderNormal} placeholder:text-muted-foreground/60`}
        />
        {!funeralVenueValidation.valid && (
          <p className="text-[11px] text-red-400 mt-1">{funeralVenueValidation.error}</p>
        )}
      </div>

      {/* Burial Location */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">
          Burial Location
          <OptionalBadge />
        </label>
        <input
          type="text"
          value={store.burialLocation}
          onChange={(e) => store.updateField('burialLocation', e.target.value)}
          placeholder="e.g. Anloga, Volta Region"
          className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Theme Selector */}
      <div>
        <label className="block text-xs text-muted-foreground mb-2">Brochure Theme</label>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(themes).map(([key, t]) => (
            <button
              key={key}
              onClick={() => store.updateField('theme', key)}
              className={`
                p-3 rounded-lg border text-left transition-all
                ${store.theme === key
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-input bg-card hover:border-input'
                }
              `}
            >
              <div className="flex gap-1 mb-1.5">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.pageBg, border: '1px solid #444' }} />
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.heading }} />
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.border }} />
              </div>
              <div className="text-xs font-medium text-card-foreground">{t.name}</div>
              <div className="text-[10px] text-muted-foreground">{t.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
