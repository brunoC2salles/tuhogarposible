## Objetivo

Melhorar o relatório PDF em `src/lib/leadsReportGenerator.ts` para incluir dados ricos de cualificação e desqualificação, e corrigir divergências nos números.

## Problemas detectados

1. **Todos os desqualificados caem em "Edad fuera de rango (>60)"** — o regex `/edad/i` captura o campo `Edad: 43` que existe em TODAS as notas. O motivo real está em `"NO CUALIFICADO - <razão>"` na 2ª linha das notas.
2. **Números divergem da base**: PDF mostra 514 total / 73 cual / 441 desc no período 16–22/07; a DB tem **523 / 74 / 449**. Causa: janela UTC `+2 dias` insuficiente + `fetchAllPaginated` com `pageSize=1000` deixa gap. Preciso ampliar janela UTC (start-1 dia, end+2 dias) para garantir cobertura de todos os dias de calendário Madrid.
3. **"Envíos exitosos al Bitrix" (74) > cualificados (73)** — o count de `webhook_logs` usa a mesma janela UTC ampla e conta reprocessamentos. Devo filtrar apenas por dias de calendário Madrid do `created_at` do log e usar `count(distinct lead_id via payload)` se possível, ou apenas explicar como envios brutos.

## Mudanças no gerador (`src/lib/leadsReportGenerator.ts`)

### Parser de notas (nova função `parseNotas`)
Extrai dos campos estruturados presentes em toda nota de Meta Ads:
- `NO CUALIFICADO - <motivo>` → motivo canônico
- `Edad: NN` → número
- `Zona: <texto>` e `Ciudad detectada: <texto>` → cidade normalizada (prioriza "Ciudad detectada")
- `Antigüedad: <valor>` → categoria
- `DNI/NIE: dni|nie`
- `Ahorros para impuestos: <texto>` → parseado a número quando possível
- `Habitaciones`, `Vivienda seleccionada`, `Plan combinado`, `Precio máx. inmueble recomendado`

Adicionalmente, extrair **ingresos mensuales** parseando o próprio texto das notas onde aparecem (quando a nota original do Meta preserva o campo) — se não estiver disponível de forma confiável, marcar "sin dato" em vez de inventar.

### Novas seções no PDF (em espanhol)

1. **Resumen ejecutivo** (mantém, corrigindo Bitrix com nota explicativa).
2. **Leads por día** (mantém).
3. **Leads por fuente** (mantém).
4. **NOVO — Motivos de descualificación** (corrigido): usa `NO CUALIFICADO - X` das notas. Categorias esperadas: antigüedad laboral, ahorros insuficientes, edad >60, ingresos <1.200€, deudas, DNI/NIE, contrato precário, duplicado, otros.
5. **NOVO — Top ciudades / zonas** (Top 15): conteo total, cualificados, descualificados por cidade (usando `Ciudad detectada` > `Zona` > `ciudad_interes`).
6. **NOVO — Distribución por edad** (buckets: <25, 25-34, 35-44, 45-54, 55-60, >60): total, cualificados, descualificados.
7. **NOVO — Distribución por antigüedad laboral** (indefinido/más de 1 año, menos de 1 año, temporal/fijo discontinuo, autónomo, otros): total + cual/desc.
8. **NOVO — Distribución por ahorros declarados** (buckets: 0€, 1-999€, 1.000-2.499€, 2.500-4.999€, ≥5.000€, sin dato).
9. **NOVO — DNI vs NIE** (total + cual/desc).
10. **Metodología** (mantém, mais nota explicando que "envíos al Bitrix" pode incluir reprocessos).

### Correções de cálculo

- Ampliar janela UTC do fetch para `start - 1 dia` até `end + 2 dias` para eliminar gap de 9 leads.
- Bitrix count: filtrar `webhook_logs` por `(created_at AT TIME ZONE 'Europe/Madrid')::date` no cliente após fetch (usar `fetchAllPaginated` de logs no período), e reportar como "envíos exitosos (incluye reintentos y reprocesos)".
- Validar após a mudança que o total do PDF bate com a DB (523/74/449 no período 16–22/07).

## Arquivos alterados

- `src/lib/leadsReportGenerator.ts` — parser, novas seções, correção de janela e Bitrix.

## Fora de escopo

- Não mudar a UI de `AdminSettings.tsx` (o botão continua igual).
- Não mudar `meta-lead-webhook` nem lógica de qualificação.
- Não criar edge function nova.

## Dúvidas

1. Confirma que quer **manter o PDF client-side** (jsPDF) ou prefere migrar para edge function? Recomendo manter — simpler e já funciona.
2. Sobre ingresos mensuales: as notas atuais **não guardam o campo "Ingresos: X€"** de forma consistente (aparece "Plan combinado" com cuota, não com ingresos brutos). Posso: (a) adicionar bucket de ingresos só quando encontrado no texto, (b) começar a persistir ingresos numa coluna dedicada nos próximos leads (mudança maior), ou (c) omitir a seção de ingresos e deixar clara a limitação. Qual prefere?
