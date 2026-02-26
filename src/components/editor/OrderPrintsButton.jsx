import { Printer } from 'lucide-react'
import { usePrintOrderStore } from '../../stores/printOrderStore'
import { useAuthStore } from '../../stores/authStore'

export default function OrderPrintsButton({ designId, productType, designName, getDesignSnapshot }) {
  const openDialog = usePrintOrderStore(s => s.openDialog)
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const setStage = usePrintOrderStore(s => s.setStage)

  const handleClick = () => {
    const snapshot = getDesignSnapshot()
    if (!isLoggedIn()) {
      openDialog(designId, productType, designName, snapshot)
      setStage('not-logged-in')
    } else {
      openDialog(designId, productType, designName, snapshot)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-md transition-colors"
      title="Order printed copies"
    >
      <Printer size={14} />
      <span className="hidden sm:inline">Order Prints</span>
    </button>
  )
}
