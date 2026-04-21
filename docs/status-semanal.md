# Status semanal — Plataforma Parrilla 8187

**Semana de 15–21 de abril de 2026**
Última atualização: terça-feira, 21/04/2026
Responsável: AntropIA · Destinatário: Parrilla 8187

---

## Resumo executivo

A plataforma está **em produção e estável** em `https://reservas.parilla8187.antrop-ia.com`. Cliente pode receber reservas reais pelo celular em menos de 30 segundos, com confirmação automática e Atendente IA (Beto) ativo. O painel administrativo está totalmente operacional para gerenciar reservas, configurar identidade visual, horários, bloqueios e áreas do restaurante.

O sistema está seguro para **demonstração ao restaurante**. Antes do lançamento público oficial (divulgação em redes, site, cardápio), restam 3 itens rápidos de configuração e a definição da data de go-live com a equipe do restaurante.

---

## Como está a plataforma (status por área)

| Área | Status | Observação |
|---|---|---|
| **Fluxo público de reserva** | ✅ Estável | 5 telas no celular, captcha ativo, gravação automática |
| **Atendente IA Beto** | ✅ Estável | Responde em tempo real, conhece todo o cardápio, lembra conversas |
| **Painel administrativo** | ✅ Estável | CRUD de reservas + configurações autônomas |
| **Configurações autônomas** | ✅ Estável | Restaurante edita identidade, horários, bloqueios e áreas |
| **Segurança e defesas** | ✅ Estável | Captcha + rate limit + validação de telefone + auditoria ativa |
| **Backup do banco** | ✅ Estável | Diário automático às 03:30, guarda 30 dias |
| **Monitoramento de disponibilidade** | 🟡 Em configuração | Infraestrutura no ar, falta ligar o alerta (5 min) |
| **Recuperação de senha admin** | 🟡 Manual | Reset hoje via equipe AntropIA; autoserviço está no próximo ciclo |
| **Edição de cardápio pelo cliente** | 🟡 No roadmap | Atualizações de preço via AntropIA (entrega em horas) |

**Legenda:** ✅ pronto · 🟡 parcial ou manual · 🔴 bloqueador (nenhum no momento)

---

## O que é seguro mostrar ao cliente agora

Tudo listado abaixo está funcional e pode ser demonstrado em reunião ou deixado para o cliente usar.

### Fluxo do cliente final (mobile)
1. Abre `reservas.parilla8187.antrop-ia.com/reservar` no celular
2. Escolhe quantas pessoas, que dia, turno (almoço ou jantar)
3. Vê horários disponíveis em tempo real
4. **Escolhe a área do restaurante** — Salão interno (🏛️ climatizado) ou Varanda externa (🌿 ao ar livre)
5. Informa nome, WhatsApp e ocasião (opcional)
6. Passa pelo captcha (bloqueia robôs, não atrapalha humanos)
7. Recebe código de reserva `#P8187-XXXX`

**Paralelo:** botão flutuante do Beto no canto da tela. Cliente pergunta "qual picanha pra 4 pessoas?" → Beto responde em tempo real com o cardápio real, sugere harmonizações. Se fechar e abrir de novo, a conversa é retomada do ponto onde parou.

### Painel administrativo do restaurante
- **Dashboard**: reservas de hoje / amanhã / próximos 7 dias + total de pessoas esperadas
- **Lista de reservas**: filtros por período (Hoje / Amanhã / Semana), busca por nome ou telefone, visualização em desktop e mobile
- **Ações em cada reserva**: confirmar pendente · cancelar · abrir WhatsApp com mensagem pronta
- **Criar reserva manualmente** (reserva por telefone, por exemplo) com escolha da área
- **Configurações autônomas** — o restaurante edita sozinho:
  - Nome, cor de marca (aparece em todo o painel) e logo
  - Horários de funcionamento por dia da semana (abre / fecha / duração de cada slot)
  - Bloqueios de agenda (feriados, eventos privados, reforma)
  - Áreas do restaurante (salão, varanda, mezanino, terraço, etc.) com emoji, descrição e ordem

### Roteiro de demo sugerido (5–7 minutos)
1. Celular: abrir `/reservar`, mostrar fluxo de reserva em 5 telas + Beto respondendo
2. Tablet ou notebook paralelo: abrir `/admin` e mostrar a reserva aparecendo no dashboard
3. `/admin/configuracoes` — **mudar a cor de marca ao vivo** (de amarelo para verde, por exemplo) e mostrar refresh do painel
4. `/admin/configuracoes/horarios` — fechar um dia da semana, abrir `/reservar` nesse dia → "não há horários"
5. `/admin/configuracoes/espacos` — **adicionar um espaço novo** (ex: "Terraço com vista"), voltar em `/reservar` → o espaço aparece automaticamente
6. `/admin/reservas` — confirmar uma reserva, abrir WhatsApp com mensagem pronta

---

## O que falta para o lançamento público oficial

### Bloqueadores (precisa fazer antes de divulgar)

1. **Configurar o monitor de disponibilidade (5 min)** — a infraestrutura do Uptime Kuma já está no ar em `uptime.parilla8187.antrop-ia.com`. Falta criar conta administrativa, apontar os 3 endereços principais para monitorar e conectar um canal de alerta (WhatsApp, Telegram ou Slack). Sem isso, se o site cair, ninguém é avisado.
2. **Teste completo no celular do dono do restaurante** — simulando cliente real. Fazer 1 reserva, receber o código, ver no painel admin. Cobre qualquer estranheza de UX que nós não pegamos.
3. **Trocar a senha admin para algo memorável** — hoje a senha é longa e aleatória. Uma vez no cofre do cliente, recomenda-se que o próprio restaurante troque por uma senha que lembre, via **autoserviço quando entregarmos o fluxo "esqueci minha senha"** (próximo ciclo — 2 horas de desenvolvimento).

### Críticos para os próximos 30 dias de operação

4. **Fluxo de "esqueci minha senha"** no admin (planejado para a próxima semana). Enquanto não estiver pronto, qualquer reset depende de acionar a equipe AntropIA.
5. **Alerta ativo de tentativa de abuso** — hoje já registramos todos os eventos suspeitos (tentativas de flood, captcha falhou, validação de telefone etc.). Falta a regra automática que dispara alerta se detectar padrão de ataque (+5 tentativas em 10 min do mesmo IP). Programado para o mesmo ciclo acima.
6. **Pipeline automatizado de deploy** — hoje novas versões são publicadas manualmente. O plano é colocar "empurrou código → deploy automático" no próximo ciclo. Não bloqueia nada, só acelera nossa cadência.

### Qualidade de vida (sem pressa, pode esperar volume real)

7. **Edição visual do cardápio do Beto pelo próprio cliente** — hoje o cardápio tem ~80 itens no código; mudança de preço vem via AntropIA e fica no ar em horas. A interface autônoma é escopo grande (1 dia de desenvolvimento) e só compensa quando o cardápio muda com mais frequência.
8. **Otimização de performance no cálculo de horários** — funciona bem até centenas de reservas por dia. Melhoria técnica que só compensa quando o restaurante tiver volume alto consistente.

---

## Decisões pendentes que precisam do lado do restaurante

- **Data oficial de lançamento público** (divulgação nas redes, cardápio físico, anúncios)
- **Pontos focais confirmados**: proprietário · gestor(a) de sala · responsável técnico/operacional
- **Canal de alerta preferido** para o monitoramento (WhatsApp, Telegram, Slack, email)
- **Decidir se os dados de teste no banco** (1 reserva de demonstração "Rafael Cavalcanti" + 2 conversas do Beto) **ficam para demo ou são apagados** antes do go-live

---

## Check-list enxuto pré go-live

- [ ] Configurar monitor Uptime Kuma (3 endereços + 1 canal de alerta)
- [ ] Teste real no celular do dono
- [ ] Entregar credenciais admin por canal seguro
- [ ] (Opcional) Apagar dados de teste do banco
- [ ] Combinar data do lançamento público
- [ ] Repassar roteiro de demo em 5–7 min para a equipe do restaurante se familiarizar antes

---

## Próximos ciclos planejados (resumo)

| Ciclo | Entrega | Prazo |
|---|---|---|
| Ciclo atual — fechamento | Monitor ligado + teste real + senha final | Esta semana |
| Ciclo 8 — autoatendimento | "Esqueci minha senha" + alerta ativo de abuso + pipeline de deploy | Próxima semana |
| Ciclo 9 — escala | Cache otimizado + preparação para segundo restaurante (multi-tenant ativo) | 2–3 semanas |
| Ciclo 10 — autonomia editorial | Cardápio editável pelo próprio restaurante | 3–4 semanas |

---

**URLs em produção**

| Endereço | Para quê serve |
|---|---|
| `reservas.parilla8187.antrop-ia.com` | Onde o cliente final reserva |
| `reservas.parilla8187.antrop-ia.com/admin/login` | Onde o restaurante acessa o painel |
| `uptime.parilla8187.antrop-ia.com` | Monitor técnico (acesso AntropIA) |
