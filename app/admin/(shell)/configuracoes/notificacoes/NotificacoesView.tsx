'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  updateNotificationSettings,
  checkInstanceStatus,
  requestQrCode,
  sendTestNotification,
  resendNotification,
  type NotificationSettingsInput,
} from './actions'

interface LogEntry {
  id: string
  event_type: string
  target_number: string
  status: string
  error: string | null
  attempted_at: string
}

interface InstanceStatusState {
  loading: boolean
  state: 'open' | 'close' | 'connecting' | 'unknown'
  qrcodeBase64?: string | null
  instanceName?: string | null
  evolutionConfigured: boolean
}

interface Props {
  initial: NotificationSettingsInput
  evolutionConfigured: boolean
  canEdit: boolean
  logs: LogEntry[]
}

const PLACEHOLDERS = ['nome', 'data', 'hora', 'pessoas', 'espaco', 'ocasiao', 'codigo']

const FAKE_CTX: Record<string, string> = {
  nome: 'Ana Silva',
  data: 'sex, 24 abr',
  hora: '20:00',
  pessoas: '4',
  espaco: '🌿 Varanda externa',
  ocasiao: 'aniversário',
  codigo: '#P8187-ABCD',
}

function renderPreview(template: string): string {
  return PLACEHOLDERS.reduce((acc, key) => {
    return acc.split(`{${key}}`).join(FAKE_CTX[key] ?? '')
  }, template)
}

export function NotificacoesView({ initial, evolutionConfigured, canEdit, logs }: Props) {
  const [form, setForm] = useState<NotificationSettingsInput>(initial)
  const [newNumber, setNewNumber] = useState('')
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const [status, setStatus] = useState<InstanceStatusState>({
    loading: false,
    state: 'unknown',
    evolutionConfigured,
    instanceName: initial.instance_name,
  })
  const [pending, startTransition] = useTransition()
  const toastRef = useRef<typeof showToast | null>(null)
  toastRef.current = showToast

  // Poll do status enquanto estiver mostrando QR code — para assim que
  // o WhatsApp parear (state vira 'open'). 4s e janela maxima 3 min.
  useEffect(() => {
    if (!status.qrcodeBase64) return
    if (status.state === 'open') return

    let active = true
    let elapsed = 0
    const interval = setInterval(async () => {
      elapsed += 4
      if (!active) return
      if (elapsed > 180) {
        // timeout: para de polar pra nao martelar a API eternamente
        clearInterval(interval)
        return
      }
      const r = await checkInstanceStatus()
      if (!active || !r.ok || !r.data) return
      if (r.data.state === 'open') {
        clearInterval(interval)
        setStatus({
          loading: false,
          state: 'open',
          qrcodeBase64: null,
          instanceName: r.data.instanceName,
          evolutionConfigured: r.data.evolutionConfigured,
        })
        toastRef.current?.('ok', '✅ WhatsApp conectado com sucesso')
      } else if (r.data.state !== status.state) {
        setStatus((s) => ({ ...s, state: r.data!.state }))
      }
    }, 4000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [status.qrcodeBase64, status.state])

  function showToast(kind: 'ok' | 'err', msg: string) {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 4500)
  }

  function addNumber() {
    const v = newNumber.trim()
    if (!v) return
    if (form.staff_numbers.includes(v)) {
      showToast('err', 'Número já adicionado')
      return
    }
    setForm({ ...form, staff_numbers: [...form.staff_numbers, v] })
    setNewNumber('')
  }

  function removeNumber(i: number) {
    setForm({ ...form, staff_numbers: form.staff_numbers.filter((_, idx) => idx !== i) })
  }

  function save() {
    startTransition(async () => {
      const r = await updateNotificationSettings(form)
      if (!r.ok) {
        showToast('err', r.error)
        return
      }
      showToast('ok', 'Salvo')
    })
  }

  function handleCheckStatus() {
    startTransition(async () => {
      setStatus((s) => ({ ...s, loading: true }))
      const r = await checkInstanceStatus()
      if (!r.ok) {
        setStatus((s) => ({ ...s, loading: false }))
        showToast('err', r.error)
        return
      }
      const d = r.data!
      setStatus({
        loading: false,
        state: d.state,
        instanceName: d.instanceName,
        qrcodeBase64: null,
        evolutionConfigured: d.evolutionConfigured,
      })
    })
  }

  function handleRequestQR() {
    startTransition(async () => {
      setStatus((s) => ({ ...s, loading: true }))
      const r = await requestQrCode()
      if (!r.ok) {
        setStatus((s) => ({ ...s, loading: false }))
        showToast('err', r.error)
        return
      }
      const d = r.data!
      setStatus({
        loading: false,
        state: d.state,
        instanceName: d.instanceName,
        qrcodeBase64: d.qrcodeBase64 ?? null,
        evolutionConfigured: true,
      })
    })
  }

  function handleTest() {
    startTransition(async () => {
      const r = await sendTestNotification()
      if (!r.ok) {
        showToast('err', r.error)
        return
      }
      const { sent, failed } = r.data!
      showToast(
        failed === 0 ? 'ok' : 'err',
        `Teste enviado — ${sent} ok, ${failed} falhas`
      )
    })
  }

  function handleResend(id: string) {
    startTransition(async () => {
      const r = await resendNotification(id)
      if (!r.ok) {
        showToast('err', r.error)
        return
      }
      showToast('ok', 'Reenviado')
    })
  }

  const statusLabel: Record<InstanceStatusState['state'], { text: string; cls: string }> = {
    open: { text: '✅ Conectado', cls: 'bg-emerald-500/20 text-emerald-300' },
    connecting: { text: '🔄 Conectando', cls: 'bg-amber-500/20 text-amber-300' },
    close: { text: '⚠️ Desconectado', cls: 'bg-red-500/20 text-red-300' },
    unknown: { text: '— Desconhecido', cls: 'bg-neutral-500/20 text-neutral-600' },
  }

  return (
    <div className="mt-8 space-y-8">
      {toast ? (
        <div
          className={`rounded border px-3 py-2 text-sm ${
            toast.kind === 'ok'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/40 bg-red-500/10 text-red-300'
          }`}
        >
          {toast.msg}
        </div>
      ) : null}

      {!evolutionConfigured ? (
        <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
          Atenção: variáveis <code className="font-mono">EVOLUTION_API_URL</code> e{' '}
          <code className="font-mono">EVOLUTION_API_KEY</code> não estão no ambiente do servidor.
          Notificações reais não funcionam até o time AntropIA configurar.
        </div>
      ) : null}

      {/* Status da instância */}
      <section className="rounded border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-900">
            Instância WhatsApp
          </h2>
          <span
            className={`rounded px-2 py-0.5 text-xs ${
              statusLabel[status.state].cls
            }`}
          >
            {statusLabel[status.state].text}
          </span>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Instância:{' '}
          <code className="font-mono">{status.instanceName || form.instance_name || '—'}</code>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={handleCheckStatus}
            disabled={pending || !canEdit}
            className="rounded border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 hover:bg-neutral-100 disabled:opacity-50"
          >
            Verificar status
          </button>
          <button
            onClick={handleRequestQR}
            disabled={pending || !canEdit || !form.instance_name}
            title={
              !form.instance_name
                ? 'Defina o nome da instância mais abaixo e clique Salvar antes de gerar o QR.'
                : undefined
            }
            className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-600 hover:bg-amber-500/20 disabled:opacity-50"
          >
            Gerar QR code
          </button>
        </div>
        {!form.instance_name ? (
          <p className="mt-2 text-xs text-amber-600">
            Preencha o <strong>nome da instância</strong> abaixo e clique{' '}
            <strong>Salvar</strong> antes de gerar o QR code.
          </p>
        ) : null}
        {status.qrcodeBase64 ? (
          <div className="mt-4 flex flex-col items-center rounded bg-white p-4">
            <img
              src={
                status.qrcodeBase64.startsWith('data:')
                  ? status.qrcodeBase64
                  : `data:image/png;base64,${status.qrcodeBase64}`
              }
              alt="QR code pra parear WhatsApp"
              className="h-64 w-64"
            />
            <p className="mt-2 text-xs text-neutral-700">
              Abra WhatsApp &gt; Dispositivos vinculados &gt; Vincular um dispositivo
            </p>
          </div>
        ) : null}
      </section>

      {/* Config */}
      <section className="space-y-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            disabled={!canEdit}
            className="h-4 w-4"
          />
          <span className="text-sm">Ativar notificações WhatsApp</span>
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Nome da instância
          </span>
          <input
            type="text"
            value={form.instance_name}
            onChange={(e) => setForm({ ...form, instance_name: e.target.value })}
            disabled={!canEdit}
            placeholder="parrilla-8187"
            className="mt-1 w-full rounded border border-neutral-200 bg-white px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-neutral-500">
            Identificador único da conexão WhatsApp (3-40 chars, sem espaços).
          </span>
        </label>

        <div>
          <span className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Números que recebem notificação
          </span>
          <ul className="mt-2 space-y-1">
            {form.staff_numbers.length === 0 ? (
              <li className="text-xs text-neutral-500">Nenhum ainda.</li>
            ) : (
              form.staff_numbers.map((n, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded border border-neutral-200 bg-white px-3 py-2 text-sm"
                >
                  <code className="font-mono">{n}</code>
                  {canEdit ? (
                    <button
                      onClick={() => removeNumber(i)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      remover
                    </button>
                  ) : null}
                </li>
              ))
            )}
          </ul>
          {canEdit ? (
            <div className="mt-2 flex gap-2">
              <input
                type="tel"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addNumber()
                  }
                }}
                placeholder="81 99999-9999"
                className="flex-1 rounded border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
              <button
                onClick={addNumber}
                className="rounded border border-neutral-300 px-3 py-2 text-xs hover:bg-neutral-100"
              >
                Adicionar
              </button>
            </div>
          ) : null}
        </div>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Template da mensagem
          </span>
          <textarea
            value={form.template_new_reservation}
            onChange={(e) =>
              setForm({ ...form, template_new_reservation: e.target.value })
            }
            disabled={!canEdit}
            rows={7}
            className="mt-1 w-full rounded border border-neutral-200 bg-white px-3 py-2 font-mono text-xs"
          />
          <span className="mt-1 block text-xs text-neutral-500">
            Variáveis:{' '}
            {PLACEHOLDERS.map((p) => (
              <code
                key={p}
                className="mx-0.5 rounded bg-neutral-100 px-1 py-0.5 font-mono"
              >
                {`{${p}}`}
              </code>
            ))}
          </span>
        </label>

        <details className="rounded border border-neutral-200 bg-white p-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-neutral-600">
            Preview
          </summary>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-neutral-800">
            {renderPreview(form.template_new_reservation)}
          </pre>
        </details>

        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={pending || !canEdit}
            className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-amber-400 disabled:opacity-50"
          >
            Salvar
          </button>
          <button
            onClick={handleTest}
            disabled={pending || !canEdit}
            className="rounded border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100 disabled:opacity-50"
          >
            Enviar teste
          </button>
        </div>
      </section>

      {/* Histórico */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-900">
          Histórico (últimas 20)
        </h2>
        {logs.length === 0 ? (
          <p className="text-xs text-neutral-500">Nenhum envio ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-neutral-200">
            <table className="min-w-full text-xs">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-3 py-2 text-left">Quando</th>
                  <th className="px-3 py-2 text-left">Evento</th>
                  <th className="px-3 py-2 text-left">Número</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Erro</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-neutral-200">
                    <td className="px-3 py-2 text-neutral-600">
                      {new Date(l.attempted_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-3 py-2">{l.event_type}</td>
                    <td className="px-3 py-2 font-mono">{l.target_number}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          l.status === 'sent'
                            ? 'text-emerald-400'
                            : l.status === 'failed'
                            ? 'text-red-400'
                            : 'text-neutral-600'
                        }
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-red-400">{l.error ?? ''}</td>
                    <td className="px-3 py-2 text-right">
                      {l.status === 'failed' && l.event_type === 'new_reservation' && canEdit ? (
                        <button
                          onClick={() => handleResend(l.id)}
                          disabled={pending}
                          className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50"
                        >
                          Reenviar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
