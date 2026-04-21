'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { upsertSpace, deleteSpace } from './actions'
import type { EstablishmentSpaceRow } from '@/app/lib/spaces'

type Role = 'owner' | 'manager' | 'operator'

interface Props {
  initial: EstablishmentSpaceRow[]
  establishmentName: string
  canEdit: boolean
  role: Role
}

interface DraftSpace {
  id?: string
  name: string
  slug: string
  description: string
  icon: string
  sortOrder: number
  isActive: boolean
}

const EMPTY: DraftSpace = {
  name: '',
  slug: '',
  description: '',
  icon: '🍽️',
  sortOrder: 0,
  isActive: true,
}

export function EspacosView({ initial, establishmentName, canEdit, role }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<DraftSpace | null>(null)
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const saveEditing = () => {
    if (!editing) return
    setToast(null)
    startTransition(async () => {
      const res = await upsertSpace({
        id: editing.id,
        name: editing.name,
        slug: editing.slug || undefined,
        description: editing.description,
        icon: editing.icon,
        sortOrder: editing.sortOrder,
        isActive: editing.isActive,
      })
      if (res.ok) {
        setToast({
          kind: 'success',
          text: editing.id ? 'Espaço atualizado' : 'Espaço criado',
        })
        setEditing(null)
        router.refresh()
      } else {
        setToast({ kind: 'error', text: res.error })
      }
    })
  }

  const removeSpace = (id: string, name: string) => {
    if (!canEdit) return
    if (!confirm(`Remover "${name}"? Reservas antigas perdem a referência mas ficam preservadas.`)) return
    setToast(null)
    startTransition(async () => {
      const res = await deleteSpace(id)
      if (res.ok) {
        setToast({ kind: 'success', text: 'Espaço removido' })
        router.refresh()
      } else {
        setToast({ kind: 'error', text: res.error })
      }
    })
  }

  const openNew = () => {
    const nextOrder =
      initial.reduce((max, s) => Math.max(max, s.sortOrder), -1) + 1
    setEditing({ ...EMPTY, sortOrder: nextOrder })
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>
          Estabelecimento:{' '}
          <span className="font-mono text-neutral-700">{establishmentName}</span>
        </span>
        {canEdit && (
          <button
            type="button"
            onClick={openNew}
            disabled={isPending || editing !== null}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Adicionar espaço
          </button>
        )}
      </div>

      {!canEdit && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Sua função (<span className="font-mono">{role}</span>) não tem
          permissão para editar espaços.
        </p>
      )}

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

      {editing && (
        <SpaceForm
          draft={editing}
          onChange={setEditing}
          onSave={saveEditing}
          onCancel={() => setEditing(null)}
          isPending={isPending}
          canEdit={canEdit}
        />
      )}

      {/* Lista */}
      <div className="rounded-lg border border-neutral-200 bg-white">
        {initial.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-neutral-400">
            Nenhum espaço cadastrado. Adicione pelo menos 1 para o fluxo de
            reserva funcionar.
          </p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {initial.map((s) => (
              <div key={s.id} className="flex items-start gap-4 px-5 py-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-neutral-50 text-2xl">
                  {s.icon ?? '🍽️'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900">{s.name}</span>
                    {!s.isActive && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                        Inativo
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-neutral-500">
                    {s.description ?? '—'}
                  </p>
                  <p className="mt-1 font-mono text-xs text-neutral-400">
                    slug: {s.slug} · ordem: {s.sortOrder}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          id: s.id,
                          name: s.name,
                          slug: s.slug,
                          description: s.description ?? '',
                          icon: s.icon ?? '🍽️',
                          sortOrder: s.sortOrder,
                          isActive: s.isActive,
                        })
                      }
                      disabled={isPending || editing !== null}
                      className="rounded-md border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSpace(s.id, s.name)}
                      disabled={isPending || editing !== null}
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SpaceForm({
  draft,
  onChange,
  onSave,
  onCancel,
  isPending,
  canEdit,
}: {
  draft: DraftSpace
  onChange: (d: DraftSpace) => void
  onSave: () => void
  onCancel: () => void
  isPending: boolean
  canEdit: boolean
}) {
  const nameValid = draft.name.trim().length >= 2 && draft.name.trim().length <= 60
  const descValid = draft.description.length <= 240
  const canSave = canEdit && !isPending && nameValid && descValid

  return (
    <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-5">
      <div className="grid gap-4 sm:grid-cols-[80px_1fr]">
        <div>
          <label className="block text-xs font-medium text-neutral-700">Ícone</label>
          <input
            type="text"
            value={draft.icon}
            onChange={(e) => onChange({ ...draft, icon: e.target.value })}
            maxLength={8}
            placeholder="🍽️"
            className="mt-1 h-12 w-full rounded-md border border-neutral-300 bg-white text-center text-2xl shadow-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
          <p className="mt-1 text-[10px] text-neutral-500">Emoji único</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-700">
              Nome
            </label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => onChange({ ...draft, name: e.target.value })}
              maxLength={60}
              placeholder="Salão interno"
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700">
              Descrição <span className="text-neutral-400">(opcional)</span>
            </label>
            <textarea
              value={draft.description}
              onChange={(e) => onChange({ ...draft, description: e.target.value })}
              maxLength={240}
              rows={2}
              placeholder="Climatizado, ideal para grupos."
              className="mt-1 block w-full resize-none rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
            <p className="mt-1 text-[10px] text-neutral-400">
              {draft.description.length}/240
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700">
                Ordem
              </label>
              <input
                type="number"
                value={draft.sortOrder}
                onChange={(e) =>
                  onChange({ ...draft, sortOrder: Number(e.target.value) })
                }
                min={0}
                max={999}
                className="mt-1 block w-24 rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-sm shadow-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            <label className="flex items-center gap-2 self-end pb-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => onChange({ ...draft, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300"
              />
              Ativo (aparece em /reservar)
            </label>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? 'Salvando...' : draft.id ? 'Salvar alterações' : 'Criar espaço'}
        </button>
      </div>
    </div>
  )
}
