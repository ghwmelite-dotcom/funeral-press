import { useBudgetStore } from '../../stores/budgetStore'
import { Download } from 'lucide-react'
import { useNotification } from '../ui/notification'

export default function BudgetExportActions() {
  const store = useBudgetStore()
  const { notify } = useNotification()

  const handleExportCSV = () => {
    const csv = store.exportCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${store.eventName || 'Funeral'}-Budget.csv`
    a.click()
    URL.revokeObjectURL(url)
    notify('Budget exported as CSV', 'success')
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-4">Export</h3>
      <button
        onClick={handleExportCSV}
        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md transition-colors"
      >
        <Download size={14} /> Export as CSV
      </button>
    </div>
  )
}
