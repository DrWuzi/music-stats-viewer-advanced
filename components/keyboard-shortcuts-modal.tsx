"use client"

import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleShowShortcuts() {
      setOpen(true)
    }

    window.addEventListener("showShortcuts", handleShowShortcuts)
    return () => {
      window.removeEventListener("showShortcuts", handleShowShortcuts)
    }
  }, [])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Keyboard Shortcuts</SheetTitle>
        </SheetHeader>
        <div className="mt-6 px-4 pb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-2 font-medium text-muted-foreground">Key</th>
                <th className="text-left pb-2 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="py-3">
                  <kbd className="px-2 py-1 rounded bg-muted font-mono text-xs">1</kbd>
                </td>
                <td className="py-3 text-foreground">Switch chart to 30d</td>
              </tr>
              <tr>
                <td className="py-3">
                  <kbd className="px-2 py-1 rounded bg-muted font-mono text-xs">2</kbd>
                </td>
                <td className="py-3 text-foreground">Switch chart to 180d</td>
              </tr>
              <tr>
                <td className="py-3">
                  <kbd className="px-2 py-1 rounded bg-muted font-mono text-xs">3</kbd>
                </td>
                <td className="py-3 text-foreground">Switch chart to 360d</td>
              </tr>
              <tr>
                <td className="py-3">
                  <kbd className="px-2 py-1 rounded bg-muted font-mono text-xs">t</kbd>
                </td>
                <td className="py-3 text-foreground">Scroll to top</td>
              </tr>
              <tr>
                <td className="py-3">
                  <kbd className="px-2 py-1 rounded bg-muted font-mono text-xs">e</kbd>
                </td>
                <td className="py-3 text-foreground">Toggle edit layout mode (owner only)</td>
              </tr>
              <tr>
                <td className="py-3">
                  <kbd className="px-2 py-1 rounded bg-muted font-mono text-xs">/</kbd>
                </td>
                <td className="py-3 text-foreground">Focus nav search</td>
              </tr>
              <tr>
                <td className="py-3">
                  <kbd className="px-2 py-1 rounded bg-muted font-mono text-xs">?</kbd>
                </td>
                <td className="py-3 text-foreground">Show this help</td>
              </tr>
              <tr>
                <td className="py-3">
                  <kbd className="px-2 py-1 rounded bg-muted font-mono text-xs">Escape</kbd>
                </td>
                <td className="py-3 text-foreground">Close panels</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SheetContent>
    </Sheet>
  )
}
