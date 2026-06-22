import { useState } from 'react'
import { useReminderStore } from '../../stores/reminderStore'
import { Plus } from 'lucide-react'

export default function CustomReminderForm() {
  const addReminder = useReminderStore(s => s.addReminder)
  const [label, setLabel] = useState('')
  const [date, setDate] = useState('')
  const [notifyBefore, setNotifyBefore] = useState(7)

  const inputClass = 'w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60'

  const handleAdd = () => {
    if (!label.trim() || !date) return
    addReminder(label.trim(), date, notifyBefore)
    setLabel('')
    setDate('')
    setNotifyBefore(7)
  }

  return (
    <div>
      <h2 className="text-sm text-muted-foreground uppercase tracking-wider mb-4 font-medium">Add Custom Reminder</h2>
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Event Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. One Year Memorial Service"
            className={inputClass}
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div className="w-32">
            <label className="block text-xs text-muted-foreground mb-1">Remind Before</label>
            <select value={notifyBefore} onChange={(e) => setNotifyBefore(Number(e.target.value))} className={inputClass}>
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>1 week</option>
              <option value={14}>2 weeks</option>
              <option value={30}>1 month</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={!label.trim() || !date}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground text-xs font-medium rounded-md transition-colors"
        >
          <Plus size={14} /> Add Reminder
        </button>
      </div>
    </div>
  )
}
