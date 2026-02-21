import { useEffect } from 'react'
import PosterNavbar from '../components/layout/PosterNavbar'
import PosterEditorLayout from '../components/layout/PosterEditorLayout'
import { usePosterStore } from '../stores/posterStore'

export default function PosterEditorPage() {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.ctrlKey && e.key === 's') {
          e.preventDefault()
          usePosterStore.getState().savePoster()
        }
        return
      }
      if (e.ctrlKey && !e.shiftKey && e.key === 's') {
        e.preventDefault()
        usePosterStore.getState().savePoster()
        return
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        e.preventDefault()
        usePosterStore.getState().redo()
        return
      }
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        usePosterStore.getState().undo()
        return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-background">
      <PosterNavbar />
      <PosterEditorLayout />
    </div>
  )
}
