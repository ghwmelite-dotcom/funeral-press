import { useEffect } from 'react'
import OneWeekNavbar from '../components/layout/OneWeekNavbar'
import OneWeekEditorLayout from '../components/layout/OneWeekEditorLayout'
import { useOneWeekStore } from '../stores/oneWeekStore'

export default function OneWeekEditorPage() {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.ctrlKey && e.key === 's') {
          e.preventDefault()
          useOneWeekStore.getState().saveDesign()
        }
        return
      }
      if (e.ctrlKey && !e.shiftKey && e.key === 's') {
        e.preventDefault()
        useOneWeekStore.getState().saveDesign()
        return
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        e.preventDefault()
        useOneWeekStore.getState().redo()
        return
      }
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        useOneWeekStore.getState().undo()
        return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-background">
      <OneWeekNavbar />
      <OneWeekEditorLayout />
    </div>
  )
}
