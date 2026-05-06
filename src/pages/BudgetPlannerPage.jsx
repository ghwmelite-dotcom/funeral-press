import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageMeta from '../components/seo/PageMeta'
import { Calculator, Save, Download, Plus, Sun, Moon, ArrowLeft } from 'lucide-react'
import { useBudgetStore, DEFAULT_CATEGORIES } from '../stores/budgetStore'
import { useThemeStore } from '../stores/themeStore'
import { useNotification } from '../components/ui/notification'
import BudgetSummaryCards from '../components/budget/BudgetSummaryCards'
import ExpenseTable from '../components/budget/ExpenseTable'
import ContributionTable from '../components/budget/ContributionTable'
import BudgetCategoryBreakdown from '../components/budget/BudgetCategoryBreakdown'
import BudgetExportActions from '../components/budget/BudgetExportActions'
import { events } from '../utils/analytics'

export default function BudgetPlannerPage() {
  const store = useBudgetStore()
  const { theme, toggleTheme } = useThemeStore()
  const { notify } = useNotification()
  const [activeTab, setActiveTab] = useState('expenses')

  const inputClass = 'w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60'

  const handleSave = () => {
    store.saveBudget()
    events.budgetPlannerUsed()
    notify('Budget saved successfully!', 'success')
  }

  const tabs = [
    { key: 'expenses', label: 'Expenses' },
    { key: 'contributions', label: 'Contributions' },
    { key: 'summary', label: 'Summary' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Funeral Budget Planner Ghana — Track Every Cost | FuneralPress"
        description="Plan your funeral budget with our free cost tracker. Covers venue, catering, casket, transport, and more. Built for Ghanaian funeral costs and customs."
        path="/budget-planner"
      />
      {/* Navbar */}
      <nav className="h-12 bg-background border-b border-border flex items-center justify-between px-4 shrink-0">
        <Link to="/" className="flex items-center gap-2 text-card-foreground hover:text-foreground transition-colors">
          <Calculator size={18} className="text-primary" />
          <span className="text-sm font-semibold tracking-wide">Budget Planner</span>
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors" title="Save">
            <Save size={14} />
            <span className="hidden sm:inline">Save</span>
          </button>
          {store.isDirty && <span className="text-[10px] text-primary ml-1">Unsaved</span>}
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Event Name */}
        <div className="mb-6">
          <input
            type="text"
            value={store.eventName}
            onChange={(e) => store.updateField('eventName', e.target.value)}
            placeholder="Event name (e.g. Funeral of Kofi Mensah)"
            className={`${inputClass} text-lg font-semibold`}
          />
        </div>

        {/* Summary Cards */}
        <BudgetSummaryCards />

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'expenses' && <ExpenseTable />}
        {activeTab === 'contributions' && <ContributionTable />}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <BudgetCategoryBreakdown />
            <BudgetExportActions />
          </div>
        )}
      </div>
    </div>
  )
}
