import { useBudgetStore, DEFAULT_CATEGORIES } from '../../stores/budgetStore'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function ExpenseTable() {
  const store = useBudgetStore()
  const [selectedCategory, setSelectedCategory] = useState('Miscellaneous')
  const inputClass = 'w-full bg-card border border-input rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className={`${inputClass} w-48`}
        >
          {DEFAULT_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          onClick={() => store.addExpense(selectedCategory)}
          className="flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-md transition-colors"
        >
          <Plus size={12} /> Add Expense
        </button>
      </div>

      {store.expenses.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No expenses yet. Add your first expense above.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 px-2 font-medium">Category</th>
                <th className="text-left py-2 px-2 font-medium">Item</th>
                <th className="text-right py-2 px-2 font-medium">Estimated</th>
                <th className="text-right py-2 px-2 font-medium">Actual</th>
                <th className="text-center py-2 px-2 font-medium">Paid</th>
                <th className="text-left py-2 px-2 font-medium">Notes</th>
                <th className="py-2 px-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {store.expenses.map(exp => (
                <tr key={exp.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 px-2">
                    <select value={exp.category} onChange={(e) => store.updateExpense(exp.id, 'category', e.target.value)} className={`${inputClass} w-32`}>
                      {DEFAULT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <input type="text" value={exp.item} onChange={(e) => store.updateExpense(exp.id, 'item', e.target.value)} placeholder="Item description" className={inputClass} />
                  </td>
                  <td className="py-2 px-2">
                    <input type="number" value={exp.estimated} onChange={(e) => store.updateExpense(exp.id, 'estimated', e.target.value)} className={`${inputClass} w-24 text-right`} />
                  </td>
                  <td className="py-2 px-2">
                    <input type="number" value={exp.actual} onChange={(e) => store.updateExpense(exp.id, 'actual', e.target.value)} className={`${inputClass} w-24 text-right`} />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <input type="checkbox" checked={exp.paid} onChange={(e) => store.updateExpense(exp.id, 'paid', e.target.checked)} className="rounded border-input" />
                  </td>
                  <td className="py-2 px-2">
                    <input type="text" value={exp.notes} onChange={(e) => store.updateExpense(exp.id, 'notes', e.target.value)} placeholder="Notes" className={`${inputClass} w-28`} />
                  </td>
                  <td className="py-2 px-2">
                    <button onClick={() => store.removeExpense(exp.id)} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
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
