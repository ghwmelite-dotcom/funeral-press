import * as Popover from '@radix-ui/react-popover'
import { SignInChooser } from './SignInChooser.jsx'

export function SignInPopover() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="px-3 py-1.5 text-sm font-medium border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
        >
          Sign in
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 bg-background border border-border rounded-xl shadow-lg p-4"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3">Sign in to FuneralPress</h3>
          <SignInChooser />
          <p className="text-xs text-muted-foreground mt-3">
            We&apos;ll never post or share without your permission.
          </p>
          <Popover.Arrow className="fill-background stroke-border" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
