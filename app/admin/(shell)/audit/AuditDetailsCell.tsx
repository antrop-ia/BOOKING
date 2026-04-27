'use client'

import { useState } from 'react'

interface Props {
  details: unknown
}

export function AuditDetailsCell({ details }: Props) {
  const [open, setOpen] = useState(false)

  if (!details || typeof details !== 'object' || Object.keys(details).length === 0) {
    return <span className="text-neutral-400">—</span>
  }

  const json = JSON.stringify(details, null, 2)
  const summary = summarize(details as Record<string, unknown>)

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span>{summary}</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[11px] text-neutral-500 underline hover:text-neutral-900"
        >
          {open ? 'ocultar' : 'json'}
        </button>
      </div>
      {open && (
        <pre className="overflow-x-auto rounded bg-neutral-50 p-2 font-mono text-[11px] text-neutral-700">
          {json}
        </pre>
      )}
    </div>
  )
}

function summarize(details: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(details)) {
    if (v === null || v === undefined) continue
    const str = typeof v === 'object' ? JSON.stringify(v) : String(v)
    parts.push(`${k}=${truncate(str, 40)}`)
    if (parts.length >= 3) break
  }
  return parts.join(' · ')
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}
