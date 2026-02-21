import { useBrochureStore } from '../../stores/brochureStore'
import { Plus, Trash2 } from 'lucide-react'

export default function OfficialsForm() {
  const store = useBrochureStore()
  const { officials } = store

  return (
    <div className="space-y-5">
      {/* Ministers */}
      <Section title="Officiating Ministers">
        {officials.ministers.map((m, i) => (
          <RolePair
            key={i}
            role={m.role}
            name={m.name}
            onRoleChange={(v) => store.updateOfficial('ministers', i, 'role', v)}
            onNameChange={(v) => store.updateOfficial('ministers', i, 'name', v)}
            onRemove={officials.ministers.length > 1 ? () => store.removeOfficial('ministers', i) : null}
          />
        ))}
        <AddButton onClick={() => store.addOfficial('ministers')} label="Add Minister" />
      </Section>

      {/* Programme Officials */}
      <Section title="Programme Officials">
        {officials.programmeOfficials.map((o, i) => (
          <RolePair
            key={i}
            role={o.role}
            name={o.name}
            onRoleChange={(v) => store.updateOfficial('programmeOfficials', i, 'role', v)}
            onNameChange={(v) => store.updateOfficial('programmeOfficials', i, 'name', v)}
            onRemove={officials.programmeOfficials.length > 1 ? () => store.removeOfficial('programmeOfficials', i) : null}
          />
        ))}
        <AddButton onClick={() => store.addOfficial('programmeOfficials')} label="Add Official" />
      </Section>

      {/* Flower Bearers */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Flower Bearers</label>
        <input
          type="text"
          value={officials.flowerBearers}
          onChange={(e) => store.updateNested('officials.flowerBearers', e.target.value)}
          placeholder="Names of flower bearers..."
          className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Pall Bearers */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Pall Bearers</label>
        <input
          type="text"
          value={officials.pallBearers}
          onChange={(e) => store.updateNested('officials.pallBearers', e.target.value)}
          placeholder="Names of pall bearers..."
          className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-2">{title}</label>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function RolePair({ role, name, onRoleChange, onNameChange, onRemove }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start">
      <input
        type="text"
        value={role}
        onChange={(e) => onRoleChange(e.target.value)}
        placeholder="Role"
        className="w-full sm:w-36 bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Name"
        className="flex-1 w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-2 text-muted-foreground hover:text-red-400 transition-colors"
          aria-label="Remove official"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

function AddButton({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/90 transition-colors mt-1"
    >
      <Plus size={14} /> {label}
    </button>
  )
}
