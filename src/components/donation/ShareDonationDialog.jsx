import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'

export function ShareDonationDialog({ memorial }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const url = `https://funeralpress.org/m/${memorial.slug}/donate`

  const onWhatsApp = () => {
    const text = `Help honour ${memorial.deceased_name}'s memory: ${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Clipboard write failed:', err)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="py-3 px-6 border border-border rounded-lg hover:bg-muted transition-colors"
      >
        Share
      </button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-2xl p-6 w-full max-w-md z-50 shadow-lg">
            <Dialog.Title className="text-lg font-semibold mb-1 text-foreground">
              Share donation link
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground mb-4">
              In memory of {memorial.deceased_name}
            </Dialog.Description>
            <div className="space-y-2">
              <button
                onClick={onWhatsApp}
                className="w-full py-3 bg-[#25D366] text-white rounded-lg font-medium hover:bg-[#1ebe5a] transition-colors"
              >
                WhatsApp
              </button>
              <button
                onClick={onCopy}
                className="w-full py-3 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                {copied ? 'Copied!' : 'Copy link'}
              </button>
              <a
                href={`/family-head/${memorial.id}/qr`}
                className="block w-full py-3 border border-border rounded-lg text-center text-foreground hover:bg-muted transition-colors"
              >
                Print QR poster
              </a>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
