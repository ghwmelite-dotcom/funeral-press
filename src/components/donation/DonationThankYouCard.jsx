import { formatMinor } from '../../utils/currency.js'

export function DonationThankYouCard({ memorial, donor, amountMinor, currency }) {
  return (
    <div className="bg-gradient-to-br from-background to-muted border border-primary rounded-2xl p-6 text-center shadow-lg">
      <p className="text-muted-foreground text-sm">{memorial.deceased_name}</p>
      <p className="text-muted-foreground text-xs mb-3">{memorial.dates}</p>
      <p className="text-foreground mb-3">A donation has been made in their memory by</p>
      <p className="text-primary text-lg font-semibold">{donor.display_name}</p>
      {amountMinor !== undefined && (
        <p className="text-muted-foreground mt-2">{formatMinor(amountMinor, currency)}</p>
      )}
    </div>
  )
}
