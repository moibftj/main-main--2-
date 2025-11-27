'use client'

import { useEffect, useState } from 'react'
import { Button } from './ui/button'

type ReviewStatusModalProps = {
  show: boolean
  status: string
}

export function ReviewStatusModal({ show, status }: ReviewStatusModalProps) {
  const [open, setOpen] = useState(show)

  useEffect(() => {
    setOpen(show)
  }, [show])

  if (!open) return null

  const statusCopy =
    status === 'under_review'
      ? 'An attorney is currently reviewing your letter.'
      : 'Your letter has been posted and is waiting for attorney review.'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12">
            <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-primary">
              ✓
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Under review</p>
            <h3 className="text-xl font-semibold text-foreground">{statusCopy}</h3>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          We have your draft safely stored and visible in your dashboard. Once our legal team approves it,
          you will see the final letter and receive a notification.
        </p>

        <div className="rounded-lg border bg-muted/60 p-3 text-sm flex items-center justify-between">
          <span className="font-medium text-foreground">Current status: {status.replace('_', ' ')}</span>
          <span className="text-muted-foreground">Typical review time: under 24 hours</span>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
