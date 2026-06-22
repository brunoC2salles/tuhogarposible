# Relatório de Análise de Leads — 01/06/2026 a 22/06/2026

## Objetivo
Entregar um **relatório estático** (artefato baixável, não nova página no app) com a análise pedida dos 1.465 leads do período (106 qualificados + 1.359 descualificados), para guiar campanhas e processos do próximo mês.

## Formato de entrega
Dois arquivos em `/mnt/documents/`:
1. **`relatorio_leads_jun2026.pdf`** — relatório executivo com gráficos e leituras (principal).
2. **`relatorio_leads_jun2026.xlsx`** — planilha com as tabelas cruas (qualificados, descualificados, contagens por motivo, por região, por faixa etária, etc.) para o time poder filtrar.

Sem alterações na UI do app — é uma análise pontual.

## Fonte de dados
Tabela `public.leads`, filtro `created_at >= 2026-06-01 AND created_at < 2026-06-23`.

- **Qualificados** = `stage = 'nuevo_lead'` (passaram pela qualificação automática Meta Ads, 106 leads).
- **Descualificados** = `stage = 'descualificados'` (1.359 leads).

Os campos do formulário Meta Ads não vêm em colunas dedicadas — vêm dentro de `notas` em formato `Chave: valor` (uma linha por campo). O motivo de descualificação também está em `notas` na linha `Qualificação automática: NO CUALIFICADO - <motivo>`. Vou parsear esse texto com regex por linha.

Campos a extrair de `notas`:
- Motivo de descualificação
- Edad
- Preferência de chamada (mañana/tarde/mediodía/noche/não especificada)
- Habitaciones
- Antigüedad laboral
- DNI/NIE
- Zona / Ciudad detectada
- Ahorros para impuestos
- Vivienda seleccionada
- Plan combinado (€/mes)
- Precio máx. recomendado

Mais colunas diretas: `ciudad_interes`, `zona_interes`, `valor_inmueble_deseado`, `source`, `created_at`.

## Conteúdo do relatório

1. **Resumo executivo** — totais, taxa de qualificação (~7,2%), volume diário, fonte.
2. **Motivos de descualificação (%)** — ranking dos motivos (ex.: ahorros insuficientes, antigüedad laboral, deuda ≥30%, edad, ingresos, contrato temporal) com barras horizontais.
3. **Perfil dos qualificados (% por campo)** — distribuição de idade (faixas 25-34/35-44/45-54/55-70), antiguidade, habitaciones, DNI vs NIE, faixa de ahorros, preferência de horário de chamada, faixa de precio máx. recomendado.
4. **Perfil dos descualificados (% por campo)** — mesmas distribuições, lado a lado para comparação.
5. **Pontos em comum — qualificados** — top combinações (ex.: "35-44 anos + más de 1 año + DNI + ahorros ≥5k").
6. **Pontos em comum — descualificados** — top combinações + correlação motivo×perfil.
7. **Regiões mais buscadas — qualificados** — top 15 cidades/zonas normalizadas (lowercase + trim).
8. **Regiões mais buscadas — descualificados** — top 15 + comunidade autônoma quando deducível.
9. **Insights acionáveis** — 5–8 bullets para campanhas (ex.: "70% dos descualificados por ahorros → criar funil educativo", "qualificados concentram-se em Madrid/Valencia → reforçar criativos regionais").

## Detalhes técnicos

1. Consulta única `SELECT id, stage, ciudad_interes, zona_interes, valor_inmueble_deseado, created_at, notas FROM leads WHERE created_at >= '2026-06-01' AND created_at < '2026-06-23'` via `supabase--read_query` (paginar se necessário — são ~1.500 linhas, cabe num call).
2. Script Python local (`/tmp/`) com pandas:
   - Parse de `notas` linha-a-linha em dict, extrai motivo de descualificação com regex `NO CUALIFICADO - (.+)`.
   - Normaliza região (lowercase, sem acento, mapeia "Madrid"/"madrid centro"/"zona madrid" para "Madrid").
   - Gera gráficos com matplotlib (barras horizontais, sem cores neon, paleta sóbria).
3. Monta PDF com `reportlab` ou `matplotlib backend_pdf` (capa + seções + gráficos embutidos).
4. Monta XLSX seguindo skill xlsx (formatação coerente, abas: `resumo`, `qualificados`, `descualificados`, `motivos`, `regioes_q`, `regioes_d`, `perfil_comparado`).
5. Validação visual: converter cada página do PDF em imagem e inspecionar antes de entregar.
6. Emite `<presentation-artifact>` para ambos os arquivos.

## Fora de escopo
- Nada de alteração em código do app, edge functions, schema ou políticas.
- Nada de nova rota/página de relatório no portal (é artefato pontual). Se quiser virar página recorrente depois, é outro pedido.
- Não envia o relatório por email — fica disponível para download na conversa.
