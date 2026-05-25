import { Sparkles, Check } from 'lucide-react'

// Dignified, non-aggressive upgrade surface for a memorial page. Renders the
// offer when the memorial isn't premium yet (clicking opens the tiered dialog);
// a quiet "Forever Tribute" badge once it is. Pricing lives in UpgradeDialog.
export default function UpgradeTributeCard({ deceasedName, premium, onUpgrade }) {
  if (premium) {
    return (
      <div
        data-testid="premium-badge"
        className="mx-auto my-8 flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
      >
        <Check size={16} aria-hidden="true" />
        Forever Tribute
      </div>
    )
  }

  return (
    <div
      data-testid="upgrade-tribute-card"
      className="mx-auto my-10 max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm"
    >
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles size={20} aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">
        Honor {deceasedName || 'their memory'} with a premium tribute
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Unlock premium themes, unlimited photos, an AI tribute video, password protection,
        remove branding, and keep this memorial online for years.
      </p>
      <button
        type="button"
        onClick={() => onUpgrade?.()}
        aria-label="View premium plans for this memorial"
        className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        View premium plans
      </button>
      <p className="mt-3 text-xs text-muted-foreground">One-time &amp; annual plans · Mobile money &amp; card</p>
    </div>
  )
}
