## Diagnóstico

O lead `lina / felinaescorpion@hotmail.com` chegou bem ao webhook, mas:

1. **Foi descualificado por engano.** O Meta enviou `rango_ingresos = "2.500€ - 4.000€"`. O parser `parseIngresos` em `supabase/functions/meta-lead-webhook/index.ts` (linhas 12-27 e 496-520) só conhece formatos como `"2000-2500"` / `"2000-2500€"`. Como o valor recebido tem ponto de milhar (`2.500`) e dois símbolos `€`, nenhum match acontece e o fallback `match(/(\d+)/)` devolve apenas `2`. Resultado nos logs: `ingresos_estimados: 2` → razão "Ingresos insuficientes (menos de 1300€)". Na realidade os ingresos declarados são 2.500-4.000 €/mês, ou seja, **deveria ter sido CUALIFICADO**.

2. **Não aparece em nenhuma lista do CRM** porque:
   - Foi gravado em `stage = 'descualificados'` **sem** `agente_asignado_id` (esperado: não atribuímos agente a descualificados).
   - O AdminCRM, por memória do projeto, vem com filtro "últimos 30 dias + excluir descualificados" ativo por defeito. Como o toggle "excluir descualificados" está ligado, o lead fica invisível mesmo para admin.
   - Nos kanbans de agente nunca apareceria (sem `agente_asignado_id`).

## Plano

### 1. Corrigir `parseIngresos` (raiz do problema)

Em `supabase/functions/meta-lead-webhook/index.ts`:

- Antes de aplicar o map / fallback, normalizar o texto:
  - remover `€`, espaços extra, `nbsp`;
  - tratar ponto e vírgula como separador de milhar quando seguidos por 3 dígitos (`2.500` → `2500`, `4,000` → `4000`).
- Detectar formato de range `A - B` (com `-`, `–`, `—`, `a`, `to`) e devolver a média `(A+B)/2`.
- Detectar `más de N` / `mas de N` / `>N` → `N * 1.2` (mantém comportamento atual ~3500 para "mais de 3000").
- Detectar `menos de N` / `<N` → `N * 0.8`.
- Só se nada disso casar, cair no fallback numérico (mas agora sobre a string já normalizada, devolvendo o número completo, não um dígito solto).
- Manter `RANGO_INGRESOS_MAP` para retro-compatibilidade.

Validação: para `"2.500€ - 4.000€"` deve devolver `3250` (>1300 → cualificado).

### 2. Deploy e re-teste

- Deploy de `meta-lead-webhook`.
- Reenviar o run do Make (Replay) com o mesmo payload e confirmar nos logs:
  - `ingresos_estimados` ≈ 3250
  - `cualificado: true` (ou descualificado por outro critério legítimo, p.ex. edad/ahorros).
- Confirmar no Supabase que um novo lead é criado com `stage` adequado.

### 3. Re-classificar o lead já existente

- Atualizar o lead `624e212d-7d0e-46d1-be73-9b3f3d545407`:
  - Re-rodar a lógica de qualificação manualmente (ou simplesmente mover `stage` para `nuevo_lead`/`preparacion_expediente` conforme o resultado correto).
  - Atribuir agente via round-robin se passar a cualificado (chamar `get-next-agent`).
- Alternativa mais simples: apagar o lead errado e pedir ao Make um replay para recriar com a lógica corrigida.

### 4. Visibilidade no AdminCRM (ajuste menor, opcional)

- Acrescentar um aviso/contador no AdminCRM (ex.: "X leads descualificados ocultos") quando o toggle de excluir descualificados estiver ativo, para que admins percebam que existem leads escondidos. Não muda o default, só dá feedback visual.

## Arquivos a alterar

- `supabase/functions/meta-lead-webhook/index.ts` — função `parseIngresos` e (se aplicável) constantes do map.
- (Opcional) `src/pages/inventario/AdminCRM.tsx` — indicador de leads descualificados ocultos.
- Atualizar memória `meta-ads-lead-normalization-v8` (ou criar nova) com o novo formato suportado.

## Fora de escopo

- Não mexer no Make.
- Não mexer no parser de ahorros (já é tolerante a este formato — funcionou corretamente neste run).
