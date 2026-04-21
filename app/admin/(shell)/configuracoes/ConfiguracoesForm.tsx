'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { updateTenant } from './actions'

type Role = 'owner' | 'manager' | 'operator'

interface FormProps {
  initial: {
    name: string
    brandColor: string
    logoUrl: string
  }
  tenantSlug: string
  role: Role
  canEdit: boolean
}

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/

export function ConfiguracoesForm({ initial, tenantSlug, role, canEdit }: FormProps) {
  const router = useRouter()
  const [name, setName] = useState(initial.name)
  const [brandColor, setBrandColor] = useState(initial.brandColor)
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl)
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const dirty =
    name !== initial.name ||
    brandColor !== initial.brandColor ||
    logoUrl !== initial.logoUrl

  const colorValid = HEX_COLOR_RE.test(brandColor)
  const nameValid = name.trim().length >= 3 && name.trim().length <= 80
  const logoValid =
    !logoUrl.trim() ||
    (() => {
      try {
        return new URL(logoUrl.trim()).protocol === 'https:'
      } catch {
        return false
      }
    })()
  const canSubmit = dirty && nameValid && colorValid && logoValid && !isPending

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setToast(null)
    startTransition(async () => {
      const res = await updateTenant({ name: name.trim(), brandColor, logoUrl: logoUrl.trim() })
      if (res.ok) {
        setToast({ kind: 'success', text: 'Configurações salvas' })
        router.refresh()
      } else {
        setToast({ kind: 'error', text: res.error })
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6">
      {/* Preview da marca */}
      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Preview
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-full border border-neutral-200"
            style={{ backgroundColor: colorValid ? brandColor : '#e5e5e5' }}
            aria-hidden
          />
          {logoUrl && logoValid && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-10 w-10 rounded object-contain"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.visibility = 'hidden'
              }}
            />
          )}
          <span className="text-base font-medium text-neutral-900">
            {name.trim() || '—'}
          </span>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-5 rounded-lg border border-neutral-200 bg-white p-6">
        <Field
          label="Nome do restaurante"
          hint="Aparece no painel e em e-mails automáticos."
          error={!nameValid && name.length > 0 ? 'Entre 3 e 80 caracteres' : undefined}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit || isPending}
            maxLength={80}
            className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-500"
          />
        </Field>

        <Field
          label="Cor de marca"
          hint="Hex RGB (ex: #F5C042). Aparece em botões e destaques do painel."
          error={!colorValid && brandColor.length > 0 ? 'Formato inválido (#RRGGBB)' : undefined}
        >
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={colorValid ? brandColor : '#000000'}
              onChange={(e) => setBrandColor(e.target.value.toUpperCase())}
              disabled={!canEdit || isPending}
              className="h-10 w-12 cursor-pointer rounded-md border border-neutral-300 disabled:cursor-not-allowed"
              aria-label="Escolher cor"
            />
            <input
              type="text"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              disabled={!canEdit || isPending}
              maxLength={7}
              className="block w-32 rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-sm uppercase shadow-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
        </Field>

        <Field
          label="URL do logo (opcional)"
          hint="Link HTTPS para uma imagem hospedada (PNG ou SVG recomendado). Deixe vazio se não tiver."
          error={!logoValid && logoUrl.length > 0 ? 'Precisa ser URL HTTPS' : undefined}
        >
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            disabled={!canEdit || isPending}
            placeholder="https://..."
            className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-500"
          />
        </Field>

        {!canEdit && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Sua função (<span className="font-mono">{role}</span>) não tem permissão para editar. Peça a um owner ou manager.
          </p>
        )}
      </div>

      {/* Campos read-only (slug + role) */}
      <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-sm">
        <Row label="Slug do tenant" value={tenantSlug} mono />
        <Row label="Sua função" value={role} mono />
        <p className="mt-3 text-xs text-neutral-400">
          Slug e função não são editáveis por aqui. Para mudar função de usuários entre em contato com o time de suporte.
        </p>
      </div>

      {toast && (
        <div
          className={`rounded-md px-4 py-2 text-sm ${
            toast.kind === 'success'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setName(initial.name)
            setBrandColor(initial.brandColor)
            setLogoUrl(initial.logoUrl)
            setToast(null)
          }}
          disabled={!dirty || isPending}
          className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Desfazer
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

/* ── Sub-components ────────────────────────────────────────────── */

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-700">{label}</label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-neutral-500">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 py-2 last:border-0">
      <span className="text-neutral-500">{label}</span>
      <span className={mono ? 'font-mono text-neutral-800' : 'text-neutral-800'}>
        {value}
      </span>
    </div>
  )
}
