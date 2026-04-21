# Regras operacionais

Regras de execução do time para este projeto. Valem para qualquer pessoa que abra uma work item, escreva código ou suba para produção. Não são sugestão — são o contrato.

Para o padrão geral da AntropIA, ver o § 04 "Padrão interno por projeto". Este documento complementa com o que é específico do **Project Booking (Parrilla 8187)**.

---

## 1. Nomenclatura de work items

Todo título de issue segue o padrão:

```
[P?][tipo][tempo] Nome claro
```

- `[P?]` — prioridade: `P0` · `P1` · `P2` · `P3`
- `[tipo]` — natureza: `feature` · `bug` · `chore` · `spike` · `refactor` · `infra`
- `[tempo]` — esforço: `15m` · `30m` · `1h` · `2h` · `4h` · `1d` · `2d`

Exemplos:

- ✓ `[P1][feature][2h] Criar modal de nova reserva`
- ✓ `[P0][bug][30m] Remover endpoint de debug /api/_admin-reset`
- ✗ `Modal de reserva` — sem prioridade, tipo e tempo; força triagem manual.

Se a estimativa passar de `2d`, **quebre em sub-issues**. Nenhum card rodando mais de dois dias seguidos sem revisão.

## 2. Labels

Todo card precisa ter **três labels**, uma de cada família:

| Família | Valores |
|---|---|
| Prioridade | `P0` · `P1` · `P2` · `P3` |
| Tipo | `feature` · `bug` · `chore` · `spike` · `refactor` · `infra` |
| Esforço | `15m` · `30m` · `1h` · `2h` · `4h` · `1d` · `2d` |

Card sem as três labels é rejeitado no review. A convenção do título **não substitui** as labels: o título é para humanos, a label é para filtragem no Plane.

## 3. Modules

Modules representam dimensões funcionais do produto. São fixos e na mesma ordem em todo projeto AntropIA:

1. Fluxo Público
2. Atendente IA
3. Disponibilidade
4. Painel Admin
5. Auth & Multi-tenant
6. Segurança & Saneamento
7. Infraestrutura & DevOps

Toda work item pertence a **exatamente um** module. Se não couber em nenhum, o card está mal definido.

## 4. Cycles (sprints)

Sprints são nomeadas por **tema**, não por data — o tema conduz a priorização:

1. Sprint 1 — Segurança
2. Sprint 2 — Admin
3. Sprint 3 — IA
4. Sprint 4 — Performance
5. Sprint 5 — Configuração
6. Sprint 6 — Anti-abuso

Ordem dos sprints é fixa. Só se inicia o seguinte quando o anterior tiver todas as work items `P0` e `P1` fechadas. Itens `P2`/`P3` que sobram rolam para o backlog.

## 5. Definição de pronto (DoD)

Uma work item só vira `Done` se:

1. Código revisado por pelo menos 1 outra pessoa (ou pelo próprio agente, com registro explícito).
2. `pnpm lint` e `pnpm typecheck` passam localmente.
3. Build (`pnpm build`) conclui sem warnings bloqueantes.
4. Fluxo manual testado em `http://localhost:3000` na branch de review.
5. Se a mudança toca produção, foi testada em staging ou em produção com rollback preparado.
6. Migration de banco (se houver) foi aplicada em Supabase dev **e** documentada no card.

## 6. Branches e commits

- Branch: `tipo/BOOK-<id>-descricao-curta` (ex.: `feature/BOOK-123-modal-reserva`).
- Commits no imperativo e no presente ("adiciona modal", não "adicionado modal").
- PR referencia a work item: `Refs BOOK-123`.
- Nunca push direto em `main`. Sempre PR, mesmo para ajuste de 1 linha.

## 7. Deploy e rollback

- **Staging** (`reservas-staging.parilla8187.antrop-ia.com`) recebe cada merge em `main`.
- **Produção** (`reservas.parilla8187.antrop-ia.com`) só recebe release tag (`vX.Y.Z`).
- Rollback de produção é via `docker service rollback` no Swarm. Cada deploy mantém a imagem anterior disponível.
- Incidente em produção → cria card `[P0][bug][?] ...`, abre canal de comunicação e coloca na sprint atual, independente do tema.

## 8. Segredos

- Segredos ficam em `.env` local (fora do Git) e em secrets do Swarm para produção.
- **Nenhum** `NEXT_PUBLIC_*` pode conter valor sensível — o prefixo já indica exposição no browser.
- Chaves de Supabase e Groq são rotacionadas a cada trimestre ou imediatamente após suspeita de vazamento.

## 9. Comunicação de bloqueios

- Bloqueio interno (dependência entre cards) → marcar `Blocked by` na work item no Plane.
- Bloqueio externo (cliente, fornecedor, dado faltando) → mover card para `Blocked`, registrar motivo no comentário e notificar o PO no mesmo dia.
- Card em `Blocked` por mais de 48h vira pauta de review.

## 10. Atualização da documentação

- `02_Status-e-Andamento.md` é atualizado **toda sexta-feira**, independentemente de entrega.
- `03_Roadmap-e-Proximos-Passos.md` é atualizado ao final de cada sprint e sempre que uma fase muda.
- `04_Decisoes-e-Alinhamentos.md` recebe entrada sempre que uma decisão não-trivial for tomada — inclusive em conversa informal.
- `05_Metricas-e-Sucesso.md` só muda por decisão de produto; mudanças aqui são raras e discutidas com o PO.
