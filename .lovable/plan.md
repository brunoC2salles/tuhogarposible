## Objetivo

1. Garantir que o campo `lead_fecha_reunion_bitrix` SEMPRE chegue ao Bitrix preenchido, mesmo quando o lead responde "mañana por la tarde" ou "lunes a las 16h".
2. Criar a base do sistema de lembretes (24h antes e 1h antes), pronto para plugar WhatsApp depois sem refazer nada.

Nada na UI muda. Nada no fluxo CRM muda. Só `meta-lead-webhook`, uma nova tabela leve e um cron.

---

## Parte 1 — Parser de data/hora

Novo módulo `supabase/functions/_shared/parseReunionDateTime.ts`, chamado pelo `meta-lead-webhook` antes de montar o payload Bitrix.

### Regras (na ordem)

Input: `texto` (resposta do lead) + `fechaLead` (data em que o lead chegou, sempre `now()` no webhook), timezone fixo `Europe/Madrid`.

**1. Normalização**
- lowercase, remove acentos, colapsa espaços
- troca `mn`/`mañ` → `mañana`, `pm`/`tarde noche` → `tarde`, etc.

**2. Hora**
| Match | Hora resultante |
|---|---|
| `HH:mm` ou `HHh` ou `HH h` ou `HH hs` (regex `(\d{1,2})[:h\s]?(\d{2})?`) | exata |
| `mañana` / `manhã` / `morning` (sem hora numérica) | 10:00 |
| `tarde` / `afternoon` (sem hora numérica) | 15:00 |
| `noche` / `evening` (sem hora numérica) | 19:00 |
| nada disso | 10:00 |

Se hora numérica < 8 e tem "tarde/noche" → soma 12 (ex: "4 de la tarde" = 16:00).

**3. Dia**
| Match | Dia resultante (relativo a `fechaLead`, Europe/Madrid) |
|---|---|
| `hoy` / `today` | hoje (se hora já passou → amanhã) |
| `mañana` / `tomorrow` (sem dia da semana) | +1 dia |
| `pasado mañana` | +2 dias |
| `lunes`/`martes`/.../`domingo` | próxima ocorrência desse dia (se for hoje, próxima semana) |
| `dd/mm` ou `dd-mm` ou `dd/mm/yyyy` | data literal |
| `cualquier`/`qualquier`/`cualquiera`/sem match | **próximo dia útil** (skip sábado/domingo) |

**4. Validação final**
- Resultado deve ser `> now() + 2h` (mínimo razoável). Se não, empurra para próximo dia útil 10h.
- Se cair sábado/domingo e o texto não mencionou explicitamente fim de semana → próximo dia útil 10h.

**5. Output**
```ts
{ fecha: "2026-06-18", hora: "15:00:00", confidence: "high" | "medium" | "low", rawInput: string }
```
- `high`: tinha dia e hora explícitos (`lunes a las 16h`, `25/06 10h`)
- `medium`: tinha um dos dois (`mañana por la tarde`)
- `low`: caiu no default (próximo dia útil 10h)

### Integração no `meta-lead-webhook`

Em `meta-lead-webhook/index.ts`, depois de extrair `hora_reunion` do payload Meta:

```ts
const parsed = parseReunionDateTime(payload.hora_reunion ?? '', new Date());
lead.fecha_reunion = parsed.fecha;
lead.hora_reunion = parsed.hora;
lead.reunion_datetime = `${parsed.fecha}T${parsed.hora}+01:00`;
// novo campo opcional
lead.reunion_confidence = parsed.confidence;
```

`buildBitrixPayloadFromLead` já tem `buildFechaReunionBitrix(fecha, hora)` que devolve `YYYY-MM-DDTHH:mm:ss` — sem mudança ali. Adiciono só `lead_reunion_confidence` ao payload para o Make poder filtrar/avisar.

### Testes Deno

Novo `parseReunionDateTime_test.ts` com casos reais que apareceram:
- "mañana x la tarde" → +1 dia 15:00
- "lunes a las 16h" → próxima segunda 16:00
- "qualquier dia - 12h" → próximo dia útil 12:00
- "25/06 10:30" → 2026-06-25 10:30
- "" / "asap" / "cuando puedan" → próximo dia útil 10:00
- "domingo 11h" (lead chega sexta) → empurra para próxima segunda 10:00

---

## Parte 2 — Infraestrutura de lembretes (sem WhatsApp ainda)

A ideia é deixar a fila de lembretes pronta para que, quando você decidir o canal (Twilio, Make, etc.), seja só plugar o envio.

### Tabela nova: `lead_reuniones_recordatorios`

| coluna | tipo | nota |
|---|---|---|
| id | uuid PK | |
| lead_id | uuid FK → leads | indexed |
| reunion_datetime | timestamptz | when reunion is scheduled |
| tipo | text | `24h` ou `1h` |
| scheduled_for | timestamptz | when to send (reunion - 24h / -1h) |
| status | text | `pending` / `sent` / `failed` / `cancelled` |
| sent_at | timestamptz null | |
| canal | text null | `whatsapp` / `sms` / `email` — preenchido quando enviar |
| error | text null | |
| created_at / updated_at | | |

Index parcial: `(status, scheduled_for) WHERE status='pending'` para o cron ser barato.

RLS: só admin/agente_asignado lê; service_role escreve. Sem grant ao anon.

### Trigger no `leads`

Quando `reunion_datetime` muda (insert ou update) e não é null:
1. Cancela recordatorios pendentes antigos do lead (`UPDATE ... SET status='cancelled' WHERE lead_id=X AND status='pending'`).
2. Insere 2 novas linhas: `24h` (`reunion - 24h`) e `1h` (`reunion - 1h`).
3. Se `scheduled_for < now()`, já marca como `cancelled` (não envia retroativo).

### Edge function `send-reunion-reminders` (cron a cada 5 min)

Pseudocódigo:
```ts
const due = await supabase
  .from('lead_reuniones_recordatorios')
  .select('*, leads(nombre_completo, telefono, agente_asignado_id, profiles:...)' )
  .eq('status', 'pending')
  .lte('scheduled_for', new Date().toISOString())
  .limit(50);

for (const r of due) {
  // POR ENQUANTO: só loga + marca como 'sent' com canal='pending_channel'
  // Quando definir o canal, troca este bloco pelo envio real.
  console.log('[reminder]', r.tipo, r.leads.telefono, r.reunion_datetime);
  await supabase.from('lead_reuniones_recordatorios')
    .update({ status: 'sent', sent_at: new Date().toISOString(), canal: 'pending_channel' })
    .eq('id', r.id);
}
```

Cron via `pg_cron` + `pg_net` a cada 5 minutos.

> Isso garante que a fila já roda hoje. No dia que escolhermos Twilio/Make, só trocamos o bloco de envio — sem mexer em trigger, tabela ou parser.

---

## Arquivos afetados

**Novos**
- `supabase/functions/_shared/parseReunionDateTime.ts`
- `supabase/functions/_shared/parseReunionDateTime_test.ts`
- `supabase/functions/send-reunion-reminders/index.ts`
- migração: tabela `lead_reuniones_recordatorios` + trigger em `leads` + cron

**Editados**
- `supabase/functions/meta-lead-webhook/index.ts` — chama parser, grava confidence
- `supabase/functions/_shared/bitrixPayload.ts` — adiciona `lead_reunion_confidence` no payload (1 linha)

**Não tocar**
- Nenhum componente React
- Nenhum hook
- Make.com payload structure (só adiciona campo opcional)

---

## Performance

- Parser é puro JS, sem regex catastrófico, <1ms por lead.
- Tabela de recordatorios tem index parcial; cron lê só `pending` vencidos (provavelmente <50 linhas por execução).
- Trigger no leads roda só quando `reunion_datetime` muda (não em qualquer UPDATE).

---

## O que NÃO está incluído (decidir depois)

- Canal real de WhatsApp (Twilio vs Make vs outro) — você disse "veremos depois". A fila já estará pronta.
- UI no CRM para ver/editar recordatorios. Posso adicionar depois se quiser.
- Reagendamento manual pelo agente disparando novos lembretes (já funciona via trigger se o agente editar `reunion_datetime`).

---

## Confirmações que preciso antes de codar

1. Timezone fixo `Europe/Madrid` está OK? (assumi sim)
2. "Próximo dia útil" = seg-sex, ignorando feriados espanhóis? (mais simples; feriados dá pra adicionar depois com lista)
3. Hora mínima da reunião = `now() + 2h`? (evita marcar reunião pra daqui 10 min)
4. Posso seguir já criando a migração da tabela `lead_reuniones_recordatorios` ou prefere revisar o schema antes?
