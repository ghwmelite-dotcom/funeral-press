import { Building2, Church } from 'lucide-react'

export default function PartnerBanner({ partner }) {
  if (!partner) return null

  const isChurch = partner.type === 'church'
  const badgeLabel = isChurch ? 'Church Partner' : 'Funeral Home Partner'
  const BadgeIcon = isChurch ? Church : Building2

  return (
    <div className="bg-card border-b border-primary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
        {/* Partner logo */}
        {partner.logoUrl && (
          <img
            src={partner.logoUrl}
            alt={partner.name}
            className="w-10 h-10 rounded-lg object-cover border border-primary/20 shrink-0"
          />
        )}

        {/* Partner info */}
        <div className="flex-1 min-w-0 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-semibold text-card-foreground truncate">
              {partner.name}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase bg-primary/20 text-primary rounded-full shrink-0">
              <BadgeIcon size={10} />
              {badgeLabel}
            </span>
          </div>
          {partner.welcomeMsg && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {partner.welcomeMsg}
            </p>
          )}
        </div>

        {/* Denomination badge for churches */}
        {isChurch && partner.denomination && (
          <span className="px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 rounded-full shrink-0">
            {partner.denomination}
          </span>
        )}
      </div>
    </div>
  )
}
