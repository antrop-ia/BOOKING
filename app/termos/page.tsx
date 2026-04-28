import Link from 'next/link'

export const metadata = {
  title: 'Termos de Uso — Parrilla 8187',
  description: 'Regras de uso do sistema de reservas online da Parrilla 8187.',
}

export default function TermosPage() {
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
          Termos de Uso
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Última atualização: 27 de abril de 2026
        </p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-neutral-800">
          <section>
            <h2 className="text-lg font-semibold">1. O serviço</h2>
            <p className="mt-2">
              Este sistema permite reservar mesas na{' '}
              <strong>Parrilla 8187</strong> (Boa Viagem, Recife/PE). Ao usar
              o serviço, você concorda com estes termos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">2. Reserva</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                A reserva é confirmada quando você recebe o código (formato{' '}
                <code className="font-mono text-sm">#P8187-XXXX</code>) na
                tela e/ou via WhatsApp.
              </li>
              <li>
                Apresente o código na chegada para identificarmos sua mesa.
              </li>
              <li>
                <strong>Tolerância de chegada:</strong> 15 minutos após o
                horário marcado. Após esse prazo a mesa pode ser liberada.
              </li>
              <li>
                <strong>Cancelamento gratuito:</strong> até 2 horas antes do
                horário, pelo link da reserva ou via WhatsApp.
              </li>
              <li>
                <strong>Limite anti-abuso:</strong> 3 reservas futuras ativas
                por número de WhatsApp.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">3. Capacidade e espaços</h2>
            <p className="mt-2">
              Cada espaço (Salão central, Área externa, Área verde) tem
              capacidade limitada em pessoas. O sistema mostra a
              disponibilidade real no momento da reserva. Reservas grandes
              (acima de 20 pessoas) recomendamos fazer contato direto via
              WhatsApp do restaurante para alinhar logística.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">4. Conduta esperada</h2>
            <p className="mt-2">Você concorda em NÃO:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Fazer reservas falsas ou em nome de terceiros sem autorização</li>
              <li>Tentar contornar o captcha ou rate limit</li>
              <li>Usar o sistema para spam, fraude ou qualquer fim ilícito</li>
              <li>Tentar acessar áreas restritas (admin) sem credencial</li>
            </ul>
            <p className="mt-2">
              Em caso de abuso, podemos cancelar reservas e bloquear o número
              ou IP.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">5. Atendente IA (Beto)</h2>
            <p className="mt-2">
              O Beto é um assistente conversacional baseado em IA. Ele pode dar
              informações sobre cardápio, horário e ambiente, mas{' '}
              <strong>não tem autoridade para confirmar reservas</strong>{' '}
              fora do fluxo padrão. Em caso de dúvida sobre disponibilidade
              real, sempre confie no que aparece na tela ou no WhatsApp do
              restaurante.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">6. Responsabilidade</h2>
            <p className="mt-2">
              Fazemos esforço razoável para manter o serviço disponível, mas
              não garantimos uptime 100%. Indisponibilidades técnicas
              esporádicas não dão direito a indenização. Em caso de falha,
              entre em contato pelo WhatsApp do restaurante.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">7. Privacidade</h2>
            <p className="mt-2">
              O tratamento de dados pessoais segue a{' '}
              <Link
                href="/privacidade"
                className="underline hover:text-neutral-900"
              >
                Política de Privacidade
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">8. Foro</h2>
            <p className="mt-2">
              Estes termos são regidos pela legislação brasileira. Foro da
              comarca de Recife/PE para dirimir qualquer questão.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-neutral-200 pt-6 text-xs text-neutral-500">
          Dúvidas? Entre em contato pelo WhatsApp do restaurante.
        </div>
      </div>
    </div>
  )
}
