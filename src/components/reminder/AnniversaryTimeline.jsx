import { useAnniversaryDates } from '../../hooks/useAnniversaryDates'
import { useReminderStore } from '../../stores/reminderStore'
import { Calendar, Heart, Cross, Star, Trash2 } from 'lucide-react'

const typeIcons = {
  birthday: Heart,
  death: Cross,
  funeral: Calendar,
  custom: Star,
}

const typeColors = {
  birthday: 'text-rose-400 bg-rose-400/10 border-rose-400/30',
  death: 'text-primary bg-primary/10 border-primary/30',
  funeral: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  custom: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
}

export default function AnniversaryTimeline() {
  const dates = useAnniversaryDates()
  const removeReminder = useReminderStore(s => s.removeReminder)

  if (dates.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="text-sm text-muted-foreground">No dates found. Load a brochure or add custom reminders.</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-sm text-muted-foreground uppercase tracking-wider mb-4 font-medium">Upcoming Dates</h2>
      <div className="space-y-3">
        {dates.map(date => {
          const Icon = typeIcons[date.type] || Calendar
          const colorClass = typeColors[date.type] || typeColors.custom
          const isToday = date.daysUntil === 0
          const isSoon = date.daysUntil <= 7

          return (
            <div
              key={date.id}
              className={`flex items-center gap-4 p-4 bg-card border rounded-xl transition-all ${
                isToday ? 'border-primary ring-1 ring-primary/20' : 'border-border'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${colorClass} shrink-0`}>
                <Icon size={16} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground">{date.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {date.originalDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  {date.yearsSince > 0 && ` · ${date.yearsSince} year${date.yearsSince !== 1 ? 's' : ''}`}
                </p>
              </div>

              {/* Days badge */}
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 ${
                isToday ? 'bg-primary text-primary-foreground' : isSoon ? 'bg-amber-500/20 text-amber-400' : 'bg-muted text-muted-foreground'
              }`}>
                {isToday ? 'TODAY' : `${date.daysUntil}d`}
              </div>

              {/* Delete button for custom reminders */}
              {!date.isAutomatic && (
                <button
                  onClick={() => removeReminder(date.id)}
                  className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                  title="Remove reminder"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
