import { useState } from 'react'
import { useDonationStore } from '../../stores/donationStore.js'

export function DonationDonorStep({ wallMode, onBack, onContinue }) {
  const donor = useDonationStore((s) => s.donor)
  const setDonor = useDonationStore((s) => s.setDonor)
  const showAnon = wallMode !== 'private'

  // Local 3-state UI selector. Wire-level visibility is binary (public | anonymous);
  // wall_mode (set by the family head, not the donor) determines whether amounts
  // are visible. We seed from donor.visibility, defaulting non-anonymous to
  // 'name_amount' since that's the most generous default.
  const [uiVisibility, setUiVisibility] = useState(
    donor.visibility === 'anonymous' ? 'anonymous' : 'name_amount'
  )

  const visibilityOptions = [
    { value: 'name_amount', label: 'Show my name and amount' },
    { value: 'name_only', label: 'Show my name only' },
    ...(showAnon ? [{ value: 'anonymous', label: 'Donate anonymously' }] : []),
  ]

  const onVis = (v) => {
    setUiVisibility(v)
    setDonor({ visibility: v === 'anonymous' ? 'anonymous' : 'public' })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">How would you like to appear on the wall?</h3>

      <div>
        <label className="block text-sm text-muted-foreground mb-1">Display name</label>
        <input
          type="text"
          autoFocus
          value={donor.display_name}
          onChange={(e) => setDonor({ display_name: e.target.value })}
          maxLength={60}
          placeholder="John K."
          className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="sr-only">Visibility</legend>
        {visibilityOptions.map((o) => (
          <label
            key={o.value}
            className="flex items-center gap-2 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted transition-colors"
          >
            <input
              type="radio"
              name="visibility"
              value={o.value}
              checked={uiVisibility === o.value}
              onChange={() => onVis(o.value)}
              className="accent-primary"
            />
            <span className="text-foreground">{o.label}</span>
          </label>
        ))}
      </fieldset>

      <div>
        <label className="block text-sm text-muted-foreground mb-1">Email (optional)</label>
        <input
          type="email"
          value={donor.email}
          onChange={(e) => setDonor({ email: e.target.value })}
          placeholder="for receipt and the family's thank-you card"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={!donor.display_name.trim()}
          className="flex-1 py-3 bg-primary text-primary-foreground font-medium rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
