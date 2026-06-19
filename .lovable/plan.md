## Objetivo

Voltar ao modelo "a definir" para horários vagos: quando o lead responde só com franja (`mañana`/`tarde`/`noche`), só com dia da semana (`lunes`), ou expressões totalmente vagas (`cualquier día`, `qualquier`), enviamos ao Bitrix **apenas a data** (sem hora atribuída automaticamente) e **não criamos recordatórios** até o agente confirmar a hora real no CRM.

## Mudanças

### 1. `supabase/functions/_shared/parseReunionDateTime.ts`
Ajustar a lógica de parsing:

- **Mantém:** detecção de data (hoje/mañana/pasado mañana/dia da semana/data explícita).
- **Mantém:** parsing de hora quando vem explícita (`16h`, `a las 18`, `lunes 10:30`, etc.).
- **Remove:** mapeamento automático `mañana→10h`, `tarde→15h`, `noche→19h`.
- **Novo comportamento quando NÃO há hora explícita:**
  - Retorna `reunion_date` (só data, formato `YYYY-MM-DD`) + `reunion_time = null`.
  - `reunion_datetime = null` (não monta timestamp).
  - `reunion_confidence = 'pending_time'` (novo valor além de high/medium/low).
  - `reunion_status = 'a_definir'`.
- **Vagueza total** (`cualquier día`, `qualquier`, vazio): `reunion_date = null`, `reunion_time = null`, `reunion_status = 'a_definir'`, `reunion_confidence = 'pending'`. **Não** cai mais no default "próximo dia útil 10h".
- Buffer de 2h e push para dia útil só se aplicam quando há datetime completo.

### 2. `supabase/functions/_shared/bitrixPayload.ts`
- Quando `reunion_datetime` é `null` mas `reunion_date` existe → enviar campo de data isolado (sem hora) ao Bitrix, e incluir flag `reunion_a_definir: true`.
- Quando ambos são `null` → não enviar campo de data; enviar `reunion_a_definir: true` e `reunion_notas_originais` com o texto cru recebido para o agente ver.

### 3. `supabase/functions/meta-lead-webhook/index.ts`
- Passar `reunion_status` e `reunion_confidence` adiante.
- Continuar gravando `reunion_datetime` apenas quando o parser devolver timestamp completo (caso contrário fica `null` no banco).

### 4. Recordatórios — `sync_lead_reunion_recordatorios` (trigger)
Já cancela pendentes e só agenda quando `reunion_datetime IS NOT NULL`. Como o parser passará a deixar `reunion_datetime = null` nesses casos, o comportamento desejado ("não criar recordatórios até confirmar") sai de graça, **sem migração nova**. Quando o agente editar a hora no CRM e popular `reunion_datetime`, o trigger agenda 24h/1h automaticamente.

### 5. Testes — `parseReunionDateTime_test.ts`
Atualizar casos:
- `"mañana"` → date = amanhã, time = null, status = `a_definir`.
- `"mañana por la tarde"` → idem (sem 15h automático).
- `"lunes"` → date = próxima segunda, time = null, status = `a_definir`.
- `"lunes a las 16h"` → datetime completo (caso "happy" continua funcionando).
- `"cualquier día"` → date null, status = `a_definir`.

## Fora de escopo

- Sem mudanças na tabela `lead_reuniones_recordatorios` nem no cron.
- Sem mudanças no CRM/UI (o agente já edita `reunion_datetime` manualmente; o trigger faz o resto).
- Sem mexer em outros parsers, hooks ou na lógica de assignment.

## Riscos

- Leads antigos com `reunion_datetime` setado pelo parser anterior continuam com hora "fake". Se quiseres limpar histórico, posso adicionar uma migração one-shot — me confirma antes.
- Bitrix precisa aceitar payload sem hora; vou enviar só a data (string ISO `YYYY-MM-DD`) + flag, mantendo o nome de campo atual para não quebrar o mapeamento existente.
