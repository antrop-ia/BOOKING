# Métricas e Sucesso

Define o que significa "o projeto deu certo". Cada métrica tem **fórmula**, **fonte do dado**, **meta** e **cadência de revisão**. Se uma métrica não pode ser medida, ela não entra aqui.

---

## Nome do cliente

Parrilla 8187 — Bar e Churrascaria

## Nome do projeto

Plataforma de Reservas Online + Atendente IA "Beto"

---

## Critérios de sucesso do projeto

O projeto é considerado **bem-sucedido** quando, dentro de 60 dias após o go-live público, as 3 condições abaixo forem verdadeiras simultaneamente:

1. **≥ 40% das reservas do restaurante chegam via plataforma** (vs. telefone / WhatsApp manual).
2. **Tempo médio para concluir uma reserva ≤ 90 segundos** (do primeiro toque até a tela de confirmação).
3. **Zero incidente crítico** de segurança, perda de dados ou indisponibilidade > 30 minutos.

---

## 1. Métricas de produto

| Métrica | Fórmula | Fonte | Meta | Cadência |
|---|---|---|---|---|
| Taxa de conversão do funil | `reservas_concluidas / sessoes_na_tela_1` | Banco (`reservations`) + analytics de sessão | ≥ 25% | Semanal |
| Tempo médio de reserva | Mediana do tempo entre `first_view` e `confirmation` | Analytics de sessão | ≤ 90s | Semanal |
| Reservas via plataforma | `reservas_via_site / total_de_reservas` | Banco + entrada manual do restaurante | ≥ 40% em 60 dias | Semanal |
| No-show | `reservas_não_compareceram / reservas_confirmadas` | Painel admin (status manual) | ≤ 15% | Mensal |
| Cancelamentos antecipados | `reservas_canceladas / reservas_confirmadas` | Banco (`reservations.status`) | ≤ 10% | Mensal |

## 2. Métricas do atendente Beto

| Métrica | Fórmula | Fonte | Meta | Cadência |
|---|---|---|---|---|
| Taxa de encaminhamento para reserva | `chats_que_clicaram_reservar / chats_iniciados` | Analytics (evento no botão de reserva) | ≥ 30% | Semanal |
| Latência primeiro token (p50) | Tempo entre envio da mensagem e primeiro chunk do stream | Logs do servidor (Groq) | ≤ 800ms | Semanal |
| Latência primeiro token (p95) | Idem | Logs do servidor | ≤ 2.5s | Semanal |
| Taxa de erro de chamada ao Groq | `erros / chamadas` | Logs do servidor | ≤ 1% | Semanal |
| Comprimento médio da conversa | Mediana de mensagens por sessão | Analytics | 3–8 mensagens | Mensal |

## 3. Métricas operacionais (admin)

| Métrica | Fórmula | Fonte | Meta | Cadência |
|---|---|---|---|---|
| Tempo médio para confirmar reserva | `confirmed_at - created_at` | Banco | ≤ 2 horas | Semanal |
| Reservas pendentes > 24h | count(`status = pending AND created_at < now() - 24h`) | Banco | = 0 | Diária |
| Uso do painel admin | Sessões ativas por dia | Supabase Auth | ≥ 1/dia útil | Semanal |

## 4. Métricas de confiabilidade

| Métrica | Fórmula | Fonte | Meta | Cadência |
|---|---|---|---|---|
| Uptime do fluxo público | `minutos_disponíveis / minutos_totais` | Healthcheck Traefik | ≥ 99.5% mensal | Mensal |
| Erros 5xx (%) | `requests_5xx / requests_total` | Logs Traefik | ≤ 0.1% | Semanal |
| Incidentes críticos | Contagem de P0 abertos no Plane | Plane (label `P0`) | 0 por mês | Mensal |
| MTTR P0 | Mediana do tempo entre criação e resolução de issues P0 | Plane | ≤ 4 horas | Mensal |

## 5. Métricas de segurança

| Métrica | Fórmula | Fonte | Meta | Cadência |
|---|---|---|---|---|
| Endpoints públicos sem auth | Contagem manual após revisão | Código + rotas Next | = 0 | Por release |
| Segredos em código/commits | Scan de `.env`, `NEXT_PUBLIC_*`, keys | Git + scanner | = 0 | Por PR |
| Tentativas de acesso admin negadas | Logs do middleware | Logs do app | Monitorar tendência | Semanal |

---

## Dashboard

O painel admin exibe **KPIs de hoje** (reservas confirmadas, pendentes, canceladas, ocupação prevista). Os indicadores com cadência semanal/mensal são revistos em retro de sprint e registrados no `02_Status-e-Andamento.md`.

## O que *não* é métrica de sucesso

- Número de linhas de código escritas.
- Quantidade de sprints executados.
- Features entregues sem uso real.

Se uma entrega não move alguma métrica desta lista, ela precisa ser justificada explicitamente no roadmap.
