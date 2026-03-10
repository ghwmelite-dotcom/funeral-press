import { useOneWeekStore } from '../../stores/oneWeekStore'

const DAY_OPTIONS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function OneWeekEventForm() {
  const store = useOneWeekStore()
  const inputClass = 'w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60'

  return (
    <div className="space-y-4">
      {/* Day of Week */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Day of Week</label>
        <select value={store.eventDay} onChange={(e) => store.updateField('eventDay', e.target.value)} className={inputClass}>
          {DAY_OPTIONS.map(d => (
            <option key={d} value={d}>{d || 'Select day...'}</option>
          ))}
        </select>
      </div>

      {/* Event Date */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Event Date</label>
        <input type="text" value={store.eventDate} onChange={(e) => store.updateField('eventDate', e.target.value)} placeholder="e.g. 18th July, 2024" className={inputClass} />
        <p className="text-[10px] text-muted-foreground/60 mt-1">Type the date as you want it displayed on the poster</p>
      </div>

      {/* Venue */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Venue / Location</label>
        <input type="text" value={store.venue} onChange={(e) => store.updateField('venue', e.target.value)} placeholder="e.g. Roman Catholic Lane, Kumasi" className={inputClass} />
      </div>

      {/* Time */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Time</label>
        <input type="text" value={store.time} onChange={(e) => store.updateField('time', e.target.value)} placeholder="e.g. 6:00AM - 6:00PM" className={inputClass} />
      </div>
    </div>
  )
}
