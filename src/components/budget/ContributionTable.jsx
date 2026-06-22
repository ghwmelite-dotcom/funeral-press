import { useBudgetStore } from '../../stores/budgetStore'
import { Plus, Trash2 } from 'lucide-react'

export default function ContributionTable() {
  const store = useBudgetStore()
  const inputClass = 'w-full bg-card border border-input rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => store.addContribution()}
          className="flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-md transition-colors"
        >
          <Plus size={12} /> Add Contribution
        </button>
      </div>

      {store.contributions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No contributions yet. Track donations and contributions above.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 px-2 font-medium">Donor Name</th>
                <th className="text-right py-2 px-2 font-medium">Amount</th>
                <th className="text-left py-2 px-2 font-medium">Date</th>
                <th className="text-left py-2 px-2 font-medium">Notes</th>
                <th className="py-2 px-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {store.contributions.map(con => (
                <tr key={con.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 px-2">
                    <input type="text" value={con.donorName} onChange={(e) => store.updateContribution(con.id, 'donorName', e.target.value)} placeholder="Donor name" className={inputClass} />
                  </td>
                  <td className="py-2 px-2">
                    <input type="number" value={con.amount} onChange={(e) => store.updateContribution(con.id, 'amount', e.target.value)} className={`${inputClass} w-28 text-right`} />
                  </td>
                  <td className="py-2 px-2">
                    <input type="date" value={con.date} onChange={(e) => store.updateContribution(con.id, 'date', e.target.value)} className={`${inputClass} w-36`} />
                  </td>
                  <td className="py-2 px-2">
                    <input type="text" value={con.notes} onChange={(e) => store.updateContribution(con.id, 'notes', e.target.value)} placeholder="Notes" className={inputClass} />
                  </td>
                  <td className="py-2 px-2">
                    <button onClick={() => store.removeContribution(con.id)} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
