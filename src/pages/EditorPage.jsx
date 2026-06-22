import { useEffect } from 'react'
import Navbar from '../components/layout/Navbar'
import EditorLayout from '../components/layout/EditorLayout'
import { useBrochureStore } from '../stores/brochureStore'
import { events } from '../utils/analytics'

export default function EditorPage() {
  // Funnel stage "Started design". Previously brochure_started was defined but
  // never emitted, so the admin funnel's middle stages always read 0.
  useEffect(() => {
    events.brochureStarted('brochure')
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip when focus is in form elements
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        // Only handle Ctrl+S in form elements (save should always work)
        if (e.ctrlKey && e.key === 's') {
          e.preventDefault()
          useBrochureStore.getState().saveBrochure()
        }
        return
      }

      // Ctrl+S: save
      if (e.ctrlKey && !e.shiftKey && e.key === 's') {
        e.preventDefault()
        useBrochureStore.getState().saveBrochure()
        return
      }

      // Ctrl+Shift+Z: redo
      if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        e.preventDefault()
        useBrochureStore.getState().redo()
        return
      }

      // Ctrl+Z: undo
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        useBrochureStore.getState().undo()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-background">
      <Navbar />
      <EditorLayout />
    </div>
  )
}
