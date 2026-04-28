import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidade — Parrilla 8187',
  description:
    'Como a Parrilla 8187 coleta, usa e protege seus dados pessoais ao fazer uma reserva.',
}

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-12">
      <div className="mx-auto max-w-2xl text-neutral-900">
        <Link
          href="/reservar"
          className="text-xs text-neutral-500 underline hover:text-neutral-900"
        >
          ← Voltar para reservar
        </Link>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          Política de Privacidade
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Última atualização: 27 de abril de 2026
        </p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-neutral-800">
          <section>
            <h2 className="text-lg font-semibold">1. Quem somos</h2>
            <p className="mt-2">
              <strong>Parrilla 8187 — Bar e Churrascaria</strong>, localizada em
              Boa Viagem, Recife/PE. Esta política descreve como tratamos seus
              dados pessoais quando você usa nosso sistema de reservas online em{' '}
              <strong>reservas.parilla8187.antrop-ia.com</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">2. Quais dados coletamos</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                <strong>Nome completo</strong> — para identificar a reserva no
                restaurante.
              </li>
              <li>
                <strong>WhatsApp</strong> — para confirmar e gerenciar a reserva
                via mensagem.
              </li>
              <li>
                <strong>Email</strong> (opcional) — para enviar lembretes e
                permitir login via magic link.
              </li>
              <li>
                <strong>Ocasião e observações</strong> — para personalizar o
                atendimento (aniversário, preferências).
              </li>
              <li>
                <strong>Endereço IP e cookies técnicos</strong> — para prevenir
                abuso e manter sua sessão.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">3. Por que coletamos</h2>
            <p className="mt-2">
              Apenas para o que é necessário para gerenciar sua reserva: confirmar
              o horário, enviar lembrete, atualizar status e atender no
              restaurante. Não enviamos comunicação comercial sem seu pedido
              explícito.
            </p>
            <p className="mt-2">
              Base legal (LGPD Art. 7º): <strong>execução de contrato</strong>{' '}
              (reserva) e <strong>legítimo interesse</strong> (anti-fraude).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">4. Compartilhamento</h2>
            <p className="mt-2">
              Não vendemos seus dados. Compartilhamos apenas com:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                <strong>Supabase</strong> (banco de dados, autenticação) —
                processador de dados sob nossa responsabilidade.
              </li>
              <li>
                <strong>Cloudflare Turnstile</strong> — para proteção contra
                bots; recebe metadados técnicos da requisição, não dados
                pessoais.
              </li>
              <li>
                <strong>Provedor de WhatsApp</strong> (Evolution API
                self-hosted) — para enviar a confirmação e lembretes.
              </li>
              <li>
                <strong>Groq</strong> — para conversação com o atendente IA
                (Beto). O conteúdo da conversa é processado pelo provedor e
                pode incluir o que você digitar; não envie dados sensíveis.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">5. Por quanto tempo guardamos</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                Reservas: até <strong>5 anos</strong> após a data, para fins
                fiscais e estatísticos.
              </li>
              <li>
                Logs de auditoria (rate limit, abuso): até{' '}
                <strong>1 ano</strong>.
              </li>
              <li>
                Cookies de sessão: <strong>30 dias</strong>.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">6. Seus direitos</h2>
            <p className="mt-2">
              Você pode, a qualquer momento, solicitar:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Acesso aos seus dados pessoais que mantemos</li>
              <li>Correção de dados incorretos</li>
              <li>Exclusão (direito ao esquecimento)</li>
              <li>Portabilidade dos dados</li>
              <li>Revogação do consentimento</li>
            </ul>
            <p className="mt-2">
              Para exercer qualquer desses direitos, entre em contato pelo
              WhatsApp do restaurante ou via email{' '}
              <strong>contato@parrilla8187.com.br</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">7. Segurança</h2>
            <p className="mt-2">
              Senhas são armazenadas com hash criptográfico (bcrypt), conexões
              usam HTTPS/TLS, dados sensíveis ficam em banco com RLS (Row-Level
              Security). Backups diários são mantidos por 30 dias.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">8. Mudanças nesta política</h2>
            <p className="mt-2">
              Podemos atualizar esta política. A versão mais recente sempre fica
              nesta página. Mudanças relevantes serão comunicadas pelo email
              cadastrado.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-neutral-200 pt-6 text-xs text-neutral-500">
          Esta política está em conformidade com a Lei Geral de Proteção de
          Dados (Lei nº 13.709/2018).
        </div>
      </div>
    </div>
  )
}
