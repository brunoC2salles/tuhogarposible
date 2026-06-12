## Diagnóstico

Os logs reais de hoje mostram que o Make está enviando apenas `hora_reunion` como texto livre (`"lunes por la mañana"`, `"Tardes (16:00 - 20:00)"`, `"Mañana 14:30"`, `"ElLunes"`, `"mañana"`) e `zona_horaria_reunion`. O campo `fecha_reunion` **não vem**. O parser atual exige `HH:MM`, falha, e salva tudo como `null`. Resultado: o Bitrix recebe campos vazios.

## Mudanças

### 1. Banco — novo campo para preservar o texto original
Adicionar `hora_reunion_texto TEXT` na tabela `leads` (mantém o texto cru exatamente como veio do Meta). Os campos atuais (`fecha_reunion DATE`, `hora_reunion TIME`, `reunion_datetime TIMESTAMPTZ`) só serão preenchidos quando o parser conseguir extrair valores válidos.

### 2. `meta-lead-webhook` — parser tolerante com fallback
- Sempre salvar o valor original em `hora_reunion_texto`.
- Tentar extrair:
  - **Dia da semana** (`lunes`, `martes`, ..., `domingo`, com/sem acento, com/sem "el", "este", "próximo") → calcula próxima data correspondente e grava em `fecha_reunion`.
  - **Hora** (`HH:MM`, `HH.MM`, `HHh`, `HHhMM`, `14:30`, `16:00-20:00` → pega o início `16:00`) → grava em `hora_reunion`.
  - **Turno sem hora exata** (`mañana`, `tarde`, `mediodía`, `noche`) → não preenche `hora_reunion` (fica null), mas guarda no texto.
- Se `fecha_reunion` + `hora_reunion` ficarem preenchidos, calcular `reunion_datetime` (Europe/Madrid → UTC).
- Aceitar também o caso ideal: se um dia o Meta passar `fecha_reunion` separado em formato `DD/MM/YYYY` ou `YYYY-MM-DD`, continuar funcionando.

### 3. `bitrixPayload.ts` — sempre mandar o texto cru
Adicionar `lead_hora_reunion_texto` ao payload (texto cru, sempre). Manter `lead_fecha_reunion`, `lead_hora_reunion`, `lead_reunion_datetime` (preenchidos apenas se o parser extraiu). O agente no Bitrix vê o texto original e os campos estruturados quando existem.

### 4. UI CRM
- `LeadCard` e `LeadDetailsModal`: exibir o texto cru (`hora_reunion_texto`) como "Preferencia de reunión: {texto}". Quando `fecha_reunion`/`hora_reunion` existirem, mostrar também formatado (`15/06/2026 às 14:30`).

### 5. Tipos
- Adicionar `hora_reunion_texto?: string | null` em `Lead` (`src/types/crm.ts`).

### 6. Validação
- Rodar 4 chamadas curl no `meta-lead-webhook` cobrindo os formatos reais observados nos logs (`"lunes por la mañana"`, `"Mañana 14:30"`, `"Tardes (16:00 - 20:00)"`, `"ElLunes"`) e confirmar que:
  - `hora_reunion_texto` é salvo cru.
  - Quando aplicável, `fecha_reunion`/`hora_reunion`/`reunion_datetime` são extraídos.
  - O payload Bitrix (via log do `bitrixPayload`) contém os 4 campos corretos.

## O que não muda
- Não vamos reprocessar leads históricos (por sua decisão).
- O JSON do Make permanece o mesmo (já manda `hora_reunion` e `zona_horaria_reunion`). Se mais tarde você quiser adicionar `fecha_reunion` como pergunta separada no formulário Meta, o código já estará pronto.

## Arquivos a editar
- `supabase/migrations/<novo>.sql` — adicionar `hora_reunion_texto`
- `supabase/functions/meta-lead-webhook/index.ts` — parser + salvamento
- `supabase/functions/_shared/bitrixPayload.ts` — novo campo no payload
- `src/types/crm.ts` — campo no tipo Lead
- `src/components/crm/LeadCard.tsx` — exibir texto cru
- `src/components/crm/LeadDetailsModal.tsx` — exibir texto cru + formatado
